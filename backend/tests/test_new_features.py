"""Tests for NUSA new features: timeline, notifications, receipts, map."""
import io
import os
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nusa-ai.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CREDS = {
    "resident": ("resident@nusa.demo", "demo123"),
    "admin": ("admin@nusa.demo", "demo123"),
    "superadmin": ("superadmin@nusa.demo", "demo123"),
}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def tokens():
    return {role: _login(e, p)["access_token"] for role, (e, p) in CREDS.items()}


def _h(t):
    return {"Authorization": f"Bearer {t}"}


def _png():
    img = Image.new("RGB", (120, 120), (200, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------- Timeline & status change ----------
class TestTimeline:
    def test_reports_include_timeline_field(self, tokens):
        r = requests.get(f"{API}/reports/all", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 20
        sample = rows[0]
        assert "timeline" in sample, "timeline field missing on report_out()"
        assert isinstance(sample["timeline"], list)
        if sample["timeline"]:
            ev = sample["timeline"][0]
            for k in ("to_status", "note", "changed_by", "created_at"):
                assert k in ev, f"timeline event missing key {k}: {ev}"

    def test_resident_reports_include_timeline(self, tokens):
        r = requests.get(f"{API}/reports", headers=_h(tokens["resident"]), timeout=20)
        assert r.status_code == 200
        for row in r.json():
            assert "timeline" in row

    def test_status_change_appends_event_and_persists(self, tokens):
        # pick a report and change to a different status
        rows = requests.get(f"{API}/reports/all", headers=_h(tokens["admin"]), timeout=20).json()
        target = None
        for row in rows:
            if row["status"] != "Selesai":
                target = row
                break
        assert target, "no non-Selesai report available"
        rid = target["id"]
        pre_len = len(target["timeline"])
        new_status = "Selesai" if target["status"] != "Selesai" else "Ditangani"

        r = requests.patch(f"{API}/reports/{rid}/status", headers=_h(tokens["admin"]),
                           json={"status": new_status, "note": "TEST_ ubah status"}, timeout=20)
        assert r.status_code == 200, r.text
        after = r.json()
        assert after["status"] == new_status
        assert len(after["timeline"]) == pre_len + 1
        last = after["timeline"][-1]
        assert last["to_status"] == new_status
        # changed_by should carry admin name
        assert last["changed_by"] and "Hendra" in last["changed_by"]

        # persistence via reload
        rows2 = requests.get(f"{API}/reports/all", headers=_h(tokens["admin"]), timeout=20).json()
        found = next(x for x in rows2 if x["id"] == rid)
        assert found["status"] == new_status
        assert len(found["timeline"]) == pre_len + 1

    def test_same_status_rejected_400(self, tokens):
        rows = requests.get(f"{API}/reports/all", headers=_h(tokens["admin"]), timeout=20).json()
        target = rows[0]
        rid = target["id"]
        cur = target["status"]
        r = requests.patch(f"{API}/reports/{rid}/status", headers=_h(tokens["admin"]),
                           json={"status": cur}, timeout=15)
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text}"
        body = r.text.lower()
        # Indonesian message should include something like 'sama' or 'sudah'
        assert any(w in body for w in ("sama", "sudah", "tidak")), body


# ---------- Notifications ----------
class TestNotifications:
    def test_notifications_scoped_and_read(self, tokens):
        # As admin, change a report belonging to demo resident to trigger a notif
        # Find a report reporter is Budi Santoso (demo resident)
        rows = requests.get(f"{API}/reports/all", headers=_h(tokens["admin"]), timeout=20).json()
        target = None
        for row in rows:
            reporter = (row.get("reporter_name") or row.get("reporter") or "").lower()
            if "budi" in reporter:
                target = row
                break
        assert target, f"no report by demo resident found; sample: {rows[0] if rows else 'none'}"

        cur = target["status"]
        new_status = "Ditangani" if cur != "Ditangani" else "Selesai"
        r = requests.patch(f"{API}/reports/{target['id']}/status", headers=_h(tokens["admin"]),
                           json={"status": new_status, "note": "TEST_ notif"}, timeout=20)
        assert r.status_code == 200, r.text

        # resident GET /notifications
        n = requests.get(f"{API}/notifications", headers=_h(tokens["resident"]), timeout=15)
        assert n.status_code == 200, n.text
        data = n.json()
        assert "unread" in data and "items" in data
        assert data["unread"] >= 1
        assert len(data["items"]) >= 1

        # ensure notifications scoped: admin's own notifications should NOT include the resident-targeted ones
        an = requests.get(f"{API}/notifications", headers=_h(tokens["admin"]), timeout=15).json()
        # each item should be scoped to caller; admin should not see resident's items
        for item in an["items"]:
            # There's no user_id in output typically; check that message differs or that admin count != resident count
            pass
        # Weaker but valid scoping check: total counts differ (admin should be less/none of resident's stream)
        # If both are identical the endpoint isn't scoped
        assert data != an or data["unread"] == 0, "notifications may not be user-scoped"

        # mark as read
        r2 = requests.post(f"{API}/notifications/read", headers=_h(tokens["resident"]), timeout=15)
        assert r2.status_code in (200, 204)
        n2 = requests.get(f"{API}/notifications", headers=_h(tokens["resident"]), timeout=15).json()
        assert n2["unread"] == 0

    def test_notifications_requires_auth(self):
        r = requests.get(f"{API}/notifications", timeout=15)
        assert r.status_code in (401, 403)


# ---------- Receipts ----------
class TestReceipts:
    def test_upload_receipt_and_fetch_image(self, tokens):
        # Get a transaction
        fin = requests.get(f"{API}/finance", headers=_h(tokens["admin"]), timeout=15).json()
        txs = fin["transactions"]
        assert txs
        # find one without receipt if possible
        target = next((t for t in txs if not t.get("receipt_path")), txs[0])
        tx_id = target["id"]

        files = {"file": ("bukti.png", _png(), "image/png")}
        r = requests.post(f"{API}/finance/{tx_id}/receipt", headers=_h(tokens["admin"]),
                          files=files, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        rp = body.get("receipt_path") or body.get("path") or ""
        # Verify persisted
        fin2 = requests.get(f"{API}/finance", headers=_h(tokens["admin"]), timeout=15).json()
        row = next(t for t in fin2["transactions"] if t["id"] == tx_id)
        assert row.get("receipt_path"), f"receipt_path not saved: {row}"
        rp = row["receipt_path"]

        # Fetch the file
        # /api/files/{path} — path may be relative
        url = f"{API}/files/{rp}" if not rp.startswith("http") else rp
        img = requests.get(url, headers=_h(tokens["admin"]), timeout=20)
        assert img.status_code == 200, f"{url} {img.status_code}"
        assert img.headers.get("content-type", "").startswith("image/"), img.headers

    def test_resident_cannot_upload_receipt(self, tokens):
        fin = requests.get(f"{API}/finance", headers=_h(tokens["admin"]), timeout=15).json()
        tx_id = fin["transactions"][0]["id"]
        files = {"file": ("bukti.png", _png(), "image/png")}
        r = requests.post(f"{API}/finance/{tx_id}/receipt", headers=_h(tokens["resident"]),
                          files=files, timeout=20)
        assert r.status_code == 403

    def test_bad_file_type(self, tokens):
        fin = requests.get(f"{API}/finance", headers=_h(tokens["admin"]), timeout=15).json()
        tx_id = fin["transactions"][0]["id"]
        files = {"file": ("bad.txt", b"hello", "text/plain")}
        r = requests.post(f"{API}/finance/{tx_id}/receipt", headers=_h(tokens["admin"]),
                          files=files, timeout=15)
        assert r.status_code == 400, r.text

    def test_unknown_tx_id_404(self, tokens):
        files = {"file": ("bukti.png", _png(), "image/png")}
        r = requests.post(f"{API}/finance/does-not-exist-xyz/receipt", headers=_h(tokens["admin"]),
                          files=files, timeout=15)
        assert r.status_code == 404


# ---------- Report map ----------
class TestReportMap:
    def test_map_admin(self, tokens):
        r = requests.get(f"{API}/reports/map", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("points", "hotspots", "center"):
            assert k in d, f"missing {k}"
        assert len(d["points"]) == 27, f"expected 27 points, got {len(d['points'])}"
        for p in d["points"][:5]:
            assert isinstance(p["lat"], (int, float))
            assert isinstance(p["lng"], (int, float))
        # points differ per RT (unique lat/lng combos per rt)
        by_rt = {}
        for p in d["points"]:
            by_rt.setdefault(p.get("rt"), set()).add((round(p["lat"], 4), round(p["lng"], 4)))
        assert len(by_rt) >= 2
        # hotspots sorted by urgent desc
        hs = d["hotspots"]
        if len(hs) >= 2:
            urgents = [h.get("urgent", h.get("high", 0)) for h in hs]
            assert urgents == sorted(urgents, reverse=True), f"hotspots not sorted by urgent: {urgents}"
        # center
        c = d["center"]
        assert "lat" in c and "lng" in c

    def test_map_resident_forbidden(self, tokens):
        r = requests.get(f"{API}/reports/map", headers=_h(tokens["resident"]), timeout=15)
        assert r.status_code == 403
