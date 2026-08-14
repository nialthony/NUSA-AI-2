from datetime import datetime, timezone
import uuid
from db import Predicate


def uid():
    return str(uuid.uuid4())


def now():
    return datetime.now(timezone.utc)


class Field:
    def __init__(self, name):
        self.name = name

    def __get__(self, instance, owner):
        return self if instance is None else instance.__dict__.get(self.name)

    def __set__(self, instance, value):
        instance.__dict__[self.name] = value

    def __eq__(self, value):
        return Predicate(self.name, "eq", value)


class Document:
    fields = ()
    defaults = {}

    def __init__(self, **kwargs):
        for name in self.fields:
            if name in kwargs:
                value = kwargs[name]
            else:
                default = self.defaults.get(name)
                value = default() if callable(default) else default
            setattr(self, name, value)

    @classmethod
    def collection_name(cls):
        return cls.__name__.lower() + "s"

    @classmethod
    def from_document(cls, document):
        values = {name: document.get(name) for name in cls.fields}
        for name, value in values.items():
            if isinstance(value, datetime) and value.tzinfo is None:
                values[name] = value.replace(tzinfo=timezone.utc)
        return cls(**values)

    def to_document(self):
        return {name: getattr(self, name) for name in self.fields}

    def ensure_id(self):
        if not self.id:
            self.id = uid()


class User(Document):
    id=Field("id"); email=Field("email"); password_hash=Field("password_hash"); name=Field("name"); role=Field("role"); phone=Field("phone"); avatar_url=Field("avatar_url"); created_at=Field("created_at")
    fields=("id","email","password_hash","name","role","phone","avatar_url","created_at")
    defaults={"id":uid,"role":"resident","phone":"","avatar_url":"","created_at":now}

class Household(Document):
    residents = None
    id=Field("id"); code=Field("code"); head_name=Field("head_name"); address=Field("address"); rt=Field("rt"); rw=Field("rw"); members_count=Field("members_count")
    fields=("id","code","head_name","address","rt","rw","members_count")
    defaults={"id":uid,"members_count":1}

class Resident(Document):
    household = None
    id=Field("id"); user_id=Field("user_id"); household_id=Field("household_id"); name=Field("name"); rt=Field("rt"); rw=Field("rw"); phone=Field("phone"); status=Field("status"); role_label=Field("role_label"); last_activity=Field("last_activity")
    fields=("id","user_id","household_id","name","rt","rw","phone","status","role_label","last_activity")
    defaults={"id":uid,"user_id":None,"household_id":None,"phone":"","status":"Aktif","role_label":"Warga","last_activity":now}

class Report(Document):
    analysis = None
    events = None
    id=Field("id"); reporter_id=Field("reporter_id"); reporter_name=Field("reporter_name"); title=Field("title"); description=Field("description"); category=Field("category"); severity=Field("severity"); status=Field("status"); rt=Field("rt"); rw=Field("rw"); location=Field("location"); image_path=Field("image_path"); lat=Field("lat"); lng=Field("lng"); created_at=Field("created_at"); resolved_at=Field("resolved_at")
    fields=("id","reporter_id","reporter_name","title","description","category","severity","status","rt","rw","location","image_path","lat","lng","created_at","resolved_at")
    defaults={"id":uid,"reporter_id":None,"reporter_name":"Warga","description":"","severity":"MEDIUM","status":"Terkirim","rt":"09","rw":"04","location":"RT 09 / RW 04","image_path":"","lat":-6.9175,"lng":107.6191,"created_at":now,"resolved_at":None}

class ReportStatusEvent(Document):
    id=Field("id"); report_id=Field("report_id"); from_status=Field("from_status"); to_status=Field("to_status"); note=Field("note"); changed_by=Field("changed_by"); created_at=Field("created_at")
    fields=("id","report_id","from_status","to_status","note","changed_by","created_at")
    defaults={"id":uid,"from_status":"","note":"","changed_by":"Sistem NUSA","created_at":now}

class Notification(Document):
    id=Field("id"); user_id=Field("user_id"); report_id=Field("report_id"); title=Field("title"); body=Field("body"); read=Field("read"); created_at=Field("created_at")
    fields=("id","user_id","report_id","title","body","read","created_at")
    defaults={"id":uid,"report_id":None,"body":"","read":False,"created_at":now}

class ReportAIAnalysis(Document):
    id=Field("id"); report_id=Field("report_id"); category=Field("category"); issue=Field("issue"); severity=Field("severity"); confidence=Field("confidence"); summary=Field("summary"); recommended_action=Field("recommended_action"); provider=Field("provider"); created_at=Field("created_at")
    fields=("id","report_id","category","issue","severity","confidence","summary","recommended_action","provider","created_at")
    defaults={"id":uid,"confidence":0.8,"summary":"","recommended_action":"","provider":"mock","created_at":now}

class FinanceTransaction(Document):
    id=Field("id"); date=Field("date"); description=Field("description"); category=Field("category"); type=Field("type"); amount=Field("amount"); receipt_path=Field("receipt_path"); created_by=Field("created_by")
    fields=("id","date","description","category","type","amount","receipt_path","created_by")
    defaults={"id":uid,"date":now,"receipt_path":"","created_by":"Admin RT"}

class Announcement(Document):
    id=Field("id"); title=Field("title"); body=Field("body"); category=Field("category"); pinned=Field("pinned"); created_by=Field("created_by"); created_at=Field("created_at")
    fields=("id","title","body","category","pinned","created_by","created_at")
    defaults={"id":uid,"category":"Umum","pinned":False,"created_by":"Admin RT","created_at":now}

class Activity(Document):
    id=Field("id"); name=Field("name"); type=Field("type"); date=Field("date"); location=Field("location"); participants=Field("participants"); target_participants=Field("target_participants"); notes=Field("notes")
    fields=("id","name","type","date","location","participants","target_participants","notes")
    defaults={"id":uid,"type":"Sosial","date":now,"location":"Balai RT 09","participants":0,"target_participants":50,"notes":""}

class CommunityMetric(Document):
    id=Field("id"); month=Field("month"); infrastructure=Field("infrastructure"); safety=Field("safety"); cleanliness=Field("cleanliness"); finance=Field("finance"); engagement=Field("engagement"); pulse=Field("pulse")
    fields=("id","month","infrastructure","safety","cleanliness","finance","engagement","pulse")
    defaults={"id":uid}

class AIConversation(Document):
    id=Field("id"); user_id=Field("user_id"); session_id=Field("session_id"); role=Field("role"); content=Field("content"); sources=Field("sources"); created_at=Field("created_at")
    fields=("id","user_id","session_id","role","content","sources","created_at")
    defaults={"id":uid,"user_id":None,"session_id":"","sources":"","created_at":now}
