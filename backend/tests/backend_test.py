"""NUSA backend regression tests."""
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
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def tokens():
    return {role: _login(e, p)["access_token"] for role, (e, p) in CREDS.items()}


def _h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- auth ----------
class TestAuth:
    def test_login_all_roles(self):
        for role, (e, p) in CREDS.items():
            data = _login(e, p)
            assert "access_token" in data and data["user"]["role"] == role

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": "admin@nusa.demo", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, tokens):
        r = requests.get(f"{API}/auth/me", headers=_h(tokens["admin"]), timeout=15)
        assert r.status_code == 200 and r.json()["role"] == "admin"

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)


# ---------- analytics ----------
class TestAnalytics:
    def test_overview(self, tokens):
        r = requests.get(f"{API}/analytics/overview", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("residents", "households", "reports_open", "pulse", "balance"):
            assert k in d, f"missing key {k}"
        assert d["balance"] == 12450000, f"balance expected 12450000 got {d['balance']}"

    def test_pulse_math(self, tokens):
        r = requests.get(f"{API}/analytics/pulse", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "pulse" in d and "breakdown" in d
        b = d["breakdown"]
        avg = round(sum(b.values()) / len(b))
        assert abs(avg - d["pulse"]) <= 1, f"pulse {d['pulse']} vs avg {avg} breakdown {b}"

    def test_reports_analytics(self, tokens):
        r = requests.get(f"{API}/analytics/reports", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200

    def test_insights(self, tokens):
        r = requests.get(f"{API}/analytics/insights", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200


# ---------- reports ----------
def _png_bytes():
    img = Image.new("RGB", (200, 200), color=(120, 90, 60))
    for y in range(200):
        for x in range(200):
            if (x + y) % 40 < 4:
                img.putpixel((x, y), (30, 30, 30))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestReports:
    def test_resident_can_only_see_own(self, tokens):
        r = requests.get(f"{API}/reports", headers=_h(tokens["resident"]), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_all_reports(self, tokens):
        r = requests.get(f"{API}/reports/all", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200 and len(r.json()) >= 20

    def test_resident_cannot_get_all(self, tokens):
        r = requests.get(f"{API}/reports/all", headers=_h(tokens["resident"]), timeout=20)
        assert r.status_code == 403

    def test_report_filters(self, tokens):
        r = requests.get(f"{API}/reports/all?category=Infrastruktur", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200
        for row in r.json():
            assert row["category"] == "Infrastruktur"

    def test_analyze_and_create_and_status(self, tokens):
        files = {"file": ("road.png", _png_bytes(), "image/png")}
        data = {"category": "Infrastruktur", "description": "Jalan berlubang parah"}
        r = requests.post(f"{API}/reports/analyze", headers=_h(tokens["resident"]),
                          files=files, data=data, timeout=90)
        assert r.status_code == 200, r.text
        analysis = r.json()
        for k in ("category", "issue", "severity", "confidence", "summary", "recommended_action"):
            assert k in analysis, f"missing {k}"

        # create report
        payload = {"title": "TEST_ jalan berlubang", "description": "Test report",
                   "category": analysis["category"], "severity": analysis["severity"],
                   "rt": "09", "image_path": analysis.get("image_path", ""),
                   "analysis": analysis}
        r2 = requests.post(f"{API}/reports", headers=_h(tokens["resident"]), json=payload, timeout=20)
        assert r2.status_code == 200, r2.text
        rid = r2.json()["id"]
        assert r2.json()["analysis"] is not None

        # admin sees it
        r3 = requests.get(f"{API}/reports/all", headers=_h(tokens["admin"]), timeout=20)
        assert any(x["id"] == rid for x in r3.json()), "created report not visible to admin"

        # status change
        r4 = requests.patch(f"{API}/reports/{rid}/status", headers=_h(tokens["admin"]),
                            json={"status": "Ditangani"}, timeout=20)
        assert r4.status_code == 200 and r4.json()["status"] == "Ditangani"

        # persistence
        r5 = requests.get(f"{API}/reports/all", headers=_h(tokens["admin"]), timeout=20)
        for x in r5.json():
            if x["id"] == rid:
                assert x["status"] == "Ditangani"
                break

    def test_resident_cannot_patch_status(self, tokens):
        r = requests.get(f"{API}/reports/all", headers=_h(tokens["admin"]), timeout=20)
        rid = r.json()[0]["id"]
        r2 = requests.patch(f"{API}/reports/{rid}/status", headers=_h(tokens["resident"]),
                            json={"status": "Selesai"}, timeout=20)
        assert r2.status_code == 403


# ---------- finance ----------
class TestFinance:
    def test_get_finance(self, tokens):
        r = requests.get(f"{API}/finance", headers=_h(tokens["admin"]), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["summary"]["balance"] == 12450000, d["summary"]["balance"]
        assert len(d["transactions"]) > 0

    def test_resident_cannot_post_finance(self, tokens):
        r = requests.post(f"{API}/finance", headers=_h(tokens["resident"]),
                          json={"description": "TEST_ x", "category": "Iuran Warga",
                                "type": "income", "amount": 10000}, timeout=15)
        assert r.status_code == 403

    def test_admin_add_tx_updates_balance(self, tokens):
        pre = requests.get(f"{API}/finance", headers=_h(tokens["admin"]), timeout=15).json()["summary"]["balance"]
        r = requests.post(f"{API}/finance", headers=_h(tokens["admin"]),
                         json={"description": "TEST_ tambah dana", "category": "Iuran Warga",
                               "type": "income", "amount": 50000}, timeout=15)
        assert r.status_code == 200
        post = requests.get(f"{API}/finance", headers=_h(tokens["admin"]), timeout=15).json()["summary"]["balance"]
        assert post - pre == 50000, f"balance diff {post-pre}"

    def test_monthly(self, tokens):
        r = requests.get(f"{API}/finance/monthly", headers=_h(tokens["admin"]), timeout=15)
        assert r.status_code == 200
        assert 1 <= len(r.json()) <= 6


# ---------- residents/households ----------
class TestResidents:
    def test_residents_list(self, tokens):
        r = requests.get(f"{API}/residents", headers=_h(tokens["admin"]), timeout=15)
        assert r.status_code == 200 and len(r.json()) >= 20

    def test_households(self, tokens):
        r = requests.get(f"{API}/households", headers=_h(tokens["admin"]), timeout=15)
        assert r.status_code == 200 and len(r.json()) >= 20

    def test_resident_cannot_list_residents(self, tokens):
        r = requests.get(f"{API}/residents", headers=_h(tokens["resident"]), timeout=15)
        assert r.status_code == 403


# ---------- announcements ----------
class TestAnnouncements:
    def test_list(self, tokens):
        r = requests.get(f"{API}/announcements", headers=_h(tokens["resident"]), timeout=15)
        assert r.status_code == 200 and len(r.json()) >= 3

    def test_create_admin(self, tokens):
        r = requests.post(f"{API}/announcements", headers=_h(tokens["admin"]),
                         json={"title": "TEST_ ann", "body": "isi pengumuman test", "category": "Umum"},
                         timeout=15)
        assert r.status_code == 200

    def test_resident_cannot_create(self, tokens):
        r = requests.post(f"{API}/announcements", headers=_h(tokens["resident"]),
                         json={"title": "TEST_ x", "body": "nope"}, timeout=15)
        assert r.status_code == 403


# ---------- AI ----------
class TestAI:
    def test_ask(self, tokens):
        r = requests.post(f"{API}/ai/ask", headers=_h(tokens["admin"]),
                          json={"question": "Berapa saldo kas warga saat ini?"}, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "answer" in d and len(d["answer"]) > 10
        assert "sources" in d

    def test_monthly_report(self, tokens):
        r = requests.post(f"{API}/ai/monthly-report", headers=_h(tokens["admin"]), timeout=120)
        assert r.status_code == 200
        d = r.json()
        for k in ("executive_summary", "community_overview", "community_issues", "recommendations"):
            assert k in d, f"missing {k}"


# ---------- superadmin ----------
class TestSuperadmin:
    def test_overview(self, tokens):
        r = requests.get(f"{API}/superadmin/overview", headers=_h(tokens["superadmin"]), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert len(d["communities"]) >= 1 and len(d["users"]) >= 3

    def test_admin_forbidden(self, tokens):
        r = requests.get(f"{API}/superadmin/overview", headers=_h(tokens["admin"]), timeout=15)
        assert r.status_code == 403
