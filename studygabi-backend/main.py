"""
StudyGabi — Backend Python (FastAPI + SQLite via SQLAlchemy)
Substitui o Supabase completamente. Rode com:
  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.sql import func
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List, Any
import uuid, os

# ── Config ──────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "studygabi-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
DATABASE_URL = "sqlite:///./studygabi.db"

# ── DB Setup ─────────────────────────────────────────────────────────────────
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class Base(DeclarativeBase): pass

# ── Models ────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())

class ProductivityRecord(Base):
    __tablename__ = "productivity_records"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    session_name = Column(String, nullable=False)
    subject = Column(String)
    duration_seconds = Column(Integer, nullable=False)
    status = Column(String, nullable=False)  # red|yellow|green
    focus = Column(String)
    started_at = Column(DateTime, default=func.now())
    ended_at = Column(DateTime, default=func.now())
    subjects_json = Column(JSON)  # [{subject, elapsed}]
    created_at = Column(DateTime, default=func.now())

class ErrorEntry(Base):
    __tablename__ = "error_entries"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=False)
    question_type = Column(String, nullable=False)
    enunciation = Column(Text, nullable=False)
    alt_a = Column(String); alt_b = Column(String); alt_c = Column(String)
    alt_d = Column(String); alt_e = Column(String)
    correct_answer = Column(String)
    answer_mirror = Column(Text)
    error_tags = Column(JSON, default=list)
    comments = Column(Text)
    last_reviewed_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())

class EditorialTopic(Base):
    __tablename__ = "editorial_topics"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    subtopic = Column(String)
    freshness = Column(String, default="red")  # red|yellow|green
    status_label = Column(String)
    notes = Column(Text)
    materials = Column(Text)
    last_reviewed_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class Argument(Base):
    __tablename__ = "arguments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=False)
    thesis = Column(Text, nullable=False)
    reasoning = Column(Text)
    example = Column(Text)
    source = Column(String)
    tags = Column(JSON, default=list)
    contributions = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class ExamQuestion(Base):
    __tablename__ = "exam_questions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=False)
    exam_name = Column(String)
    year = Column(Integer)
    enunciation = Column(Text, nullable=False)
    alternatives = Column(JSON, default=list)
    correct_answer = Column(String)
    explanation = Column(Text)
    difficulty = Column(String, default="medium")
    times_answered = Column(Integer, default=0)
    times_correct = Column(Integer, default=0)
    last_answered_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())

class BrainDump(Base):
    __tablename__ = "brain_dumps"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())

class SmartReviewQuestion(Base):
    __tablename__ = "smart_review_questions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    last_reviewed_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())

class DiscursivaTheme(Base):
    __tablename__ = "discursiva_themes"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    theme = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    context = Column(Text)
    difficulty = Column(String, default="medium")
    created_at = Column(DateTime, default=func.now())

class DiscursivaEssay(Base):
    __tablename__ = "discursiva_essays"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    theme_id = Column(String)
    theme_text = Column(String)
    content = Column(Text, nullable=False)
    ai_score = Column(Integer)
    ai_feedback = Column(Text)
    created_at = Column(DateTime, default=func.now())

Base.metadata.create_all(bind=engine)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="StudyGabi API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helpers ────────────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def hash_password(pw: str) -> str: return pwd_ctx.hash(pw)
def verify_password(plain: str, hashed: str) -> bool: return pwd_ctx.verify(plain, hashed)

def create_token(user_id: str) -> str:
    exp = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id: raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user

def to_dict(obj) -> dict:
    d = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
    for k, v in d.items():
        if isinstance(v, datetime): d[k] = v.isoformat()
    return d

# ── Schemas ────────────────────────────────────────────────────────────────────
class RegisterSchema(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None

class ProductivityRecordIn(BaseModel):
    session_name: str
    subject: Optional[str] = None
    duration_seconds: int
    status: str
    focus: Optional[str] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    subjects_json: Optional[List[dict]] = None

class ErrorEntryIn(BaseModel):
    subject: str
    question_type: str
    enunciation: str
    alt_a: Optional[str] = None; alt_b: Optional[str] = None
    alt_c: Optional[str] = None; alt_d: Optional[str] = None; alt_e: Optional[str] = None
    correct_answer: Optional[str] = None
    answer_mirror: Optional[str] = None
    error_tags: Optional[List[str]] = []
    comments: Optional[str] = None

class EditorialTopicIn(BaseModel):
    subject: str; topic: str; subtopic: Optional[str] = None
    freshness: str = "red"
    status_label: Optional[str] = None
    notes: Optional[str] = None
    materials: Optional[str] = None

class EditorialTopicUpdate(BaseModel):
    subject: Optional[str] = None; topic: Optional[str] = None
    subtopic: Optional[str] = None; freshness: Optional[str] = None
    status_label: Optional[str] = None; notes: Optional[str] = None
    materials: Optional[str] = None

class ArgumentIn(BaseModel):
    subject: str; thesis: str
    reasoning: Optional[str] = None; example: Optional[str] = None
    source: Optional[str] = None; tags: Optional[List[str]] = []

class ArgumentUpdate(BaseModel):
    tags: Optional[List[str]] = None
    contributions: Optional[str] = None

class ExamQuestionIn(BaseModel):
    subject: str; exam_name: Optional[str] = None; year: Optional[int] = None
    enunciation: str; alternatives: Optional[List[str]] = []
    correct_answer: Optional[str] = None; explanation: Optional[str] = None
    difficulty: str = "medium"

class ExamQuestionAnswer(BaseModel):
    is_correct: bool

class BrainDumpIn(BaseModel):
    content: str

class SmartReviewIn(BaseModel):
    subject: str; question: str; answer: str

class DiscursivaThemeIn(BaseModel):
    theme: str; subject: str
    context: Optional[str] = None; difficulty: str = "medium"

class DiscursivaEssayIn(BaseModel):
    theme_id: Optional[str] = None; theme_text: Optional[str] = None
    content: str; ai_score: Optional[int] = None; ai_feedback: Optional[str] = None

# ── Auth ────────────────────────────────────────────────────────────────────────
@app.post("/auth/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "E-mail já cadastrado.")
    user = User(email=data.email, display_name=data.display_name or data.email.split("@")[0],
                hashed_password=hash_password(data.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": create_token(user.id), "token_type": "bearer",
            "user": {"id": user.id, "email": user.email, "display_name": user.display_name}}

@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "E-mail ou senha inválidos.")
    return {"access_token": create_token(user.id), "token_type": "bearer",
            "user": {"id": user.id, "email": user.email, "display_name": user.display_name}}

@app.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "display_name": user.display_name}

# ── Productivity Records ────────────────────────────────────────────────────────
@app.get("/productivity-records")
def list_records(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(ProductivityRecord).filter(ProductivityRecord.user_id == user.id)\
             .order_by(ProductivityRecord.started_at.desc()).all()
    return [to_dict(r) for r in rows]

@app.post("/productivity-records", status_code=201)
def create_record(data: ProductivityRecordIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = ProductivityRecord(user_id=user.id, **data.model_dump())
    if data.started_at: r.started_at = datetime.fromisoformat(data.started_at)
    if data.ended_at: r.ended_at = datetime.fromisoformat(data.ended_at)
    db.add(r); db.commit(); db.refresh(r)
    return to_dict(r)

# ── Error Entries ───────────────────────────────────────────────────────────────
@app.get("/error-entries")
def list_errors(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(ErrorEntry).filter(ErrorEntry.user_id == user.id)\
             .order_by(ErrorEntry.created_at.desc()).all()
    return [to_dict(r) for r in rows]

@app.post("/error-entries", status_code=201)
def create_error(data: ErrorEntryIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = ErrorEntry(user_id=user.id, **data.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return to_dict(r)

@app.delete("/error-entries/{id}", status_code=204)
def delete_error(id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(ErrorEntry).filter(ErrorEntry.id == id, ErrorEntry.user_id == user.id).first()
    if not r: raise HTTPException(404)
    db.delete(r); db.commit()

# ── Editorial Topics ────────────────────────────────────────────────────────────
@app.get("/editorial-topics")
def list_editorial(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(EditorialTopic).filter(EditorialTopic.user_id == user.id)\
             .order_by(EditorialTopic.subject).all()
    return [to_dict(r) for r in rows]

@app.post("/editorial-topics", status_code=201)
def create_editorial(data: EditorialTopicIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = EditorialTopic(user_id=user.id, **data.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return to_dict(r)

@app.patch("/editorial-topics/{id}")
def update_editorial(id: str, data: EditorialTopicUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(EditorialTopic).filter(EditorialTopic.id == id, EditorialTopic.user_id == user.id).first()
    if not r: raise HTTPException(404)
    for k, v in data.model_dump(exclude_none=True).items(): setattr(r, k, v)
    r.last_reviewed_at = datetime.utcnow()
    db.commit(); db.refresh(r)
    return to_dict(r)

@app.delete("/editorial-topics/{id}", status_code=204)
def delete_editorial(id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(EditorialTopic).filter(EditorialTopic.id == id, EditorialTopic.user_id == user.id).first()
    if not r: raise HTTPException(404)
    db.delete(r); db.commit()

# ── Arguments ────────────────────────────────────────────────────────────────────
@app.get("/arguments")
def list_arguments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Argument).filter(Argument.user_id == user.id)\
             .order_by(Argument.created_at.desc()).all()
    return [to_dict(r) for r in rows]

@app.post("/arguments", status_code=201)
def create_argument(data: ArgumentIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = Argument(user_id=user.id, **data.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return to_dict(r)

@app.patch("/arguments/{id}")
def update_argument(id: str, data: ArgumentUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(Argument).filter(Argument.id == id, Argument.user_id == user.id).first()
    if not r: raise HTTPException(404)
    for k, v in data.model_dump(exclude_none=True).items(): setattr(r, k, v)
    db.commit(); db.refresh(r)
    return to_dict(r)

@app.delete("/arguments/{id}", status_code=204)
def delete_argument(id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(Argument).filter(Argument.id == id, Argument.user_id == user.id).first()
    if not r: raise HTTPException(404)
    db.delete(r); db.commit()

# ── Exam Questions ────────────────────────────────────────────────────────────────
@app.get("/exam-questions")
def list_questions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(ExamQuestion).filter(ExamQuestion.user_id == user.id)\
             .order_by(ExamQuestion.created_at.desc()).all()
    return [to_dict(r) for r in rows]

@app.post("/exam-questions", status_code=201)
def create_question(data: ExamQuestionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = ExamQuestion(user_id=user.id, **data.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return to_dict(r)

@app.patch("/exam-questions/{id}/answer")
def answer_question(id: str, data: ExamQuestionAnswer, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(ExamQuestion).filter(ExamQuestion.id == id, ExamQuestion.user_id == user.id).first()
    if not r: raise HTTPException(404)
    r.times_answered += 1
    if data.is_correct: r.times_correct += 1
    r.last_answered_at = datetime.utcnow()
    db.commit(); db.refresh(r)
    return to_dict(r)

@app.delete("/exam-questions/{id}", status_code=204)
def delete_question(id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(ExamQuestion).filter(ExamQuestion.id == id, ExamQuestion.user_id == user.id).first()
    if not r: raise HTTPException(404)
    db.delete(r); db.commit()

# ── Brain Dumps ────────────────────────────────────────────────────────────────────
@app.get("/brain-dumps")
def list_dumps(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(BrainDump).filter(BrainDump.user_id == user.id)\
             .order_by(BrainDump.created_at.desc()).limit(20).all()
    return [to_dict(r) for r in rows]

@app.post("/brain-dumps", status_code=201)
def create_dump(data: BrainDumpIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = BrainDump(user_id=user.id, content=data.content)
    db.add(r); db.commit(); db.refresh(r)
    return to_dict(r)

@app.delete("/brain-dumps/{id}", status_code=204)
def delete_dump(id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(BrainDump).filter(BrainDump.id == id, BrainDump.user_id == user.id).first()
    if not r: raise HTTPException(404)
    db.delete(r); db.commit()

# ── Smart Review ────────────────────────────────────────────────────────────────────
@app.get("/smart-review")
def list_review(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from sqlalchemy import or_, and_
    cutoff = datetime.utcnow() - timedelta(days=3)
    rows = db.query(SmartReviewQuestion).filter(
        SmartReviewQuestion.user_id == user.id,
        or_(SmartReviewQuestion.last_reviewed_at == None,
            SmartReviewQuestion.last_reviewed_at < cutoff)
    ).all()
    return [to_dict(r) for r in rows]

@app.post("/smart-review", status_code=201)
def create_review(data: SmartReviewIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = SmartReviewQuestion(user_id=user.id, **data.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return to_dict(r)

@app.patch("/smart-review/{id}/reviewed")
def mark_reviewed(id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(SmartReviewQuestion).filter(SmartReviewQuestion.id == id, SmartReviewQuestion.user_id == user.id).first()
    if not r: raise HTTPException(404)
    r.last_reviewed_at = datetime.utcnow()
    db.commit()
    return {"ok": True}

# ── Discursivas ────────────────────────────────────────────────────────────────────
@app.get("/discursiva-themes")
def list_themes(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(DiscursivaTheme).filter(DiscursivaTheme.user_id == user.id)\
             .order_by(DiscursivaTheme.created_at.desc()).all()
    return [to_dict(r) for r in rows]

@app.post("/discursiva-themes", status_code=201)
def create_theme(data: DiscursivaThemeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = DiscursivaTheme(user_id=user.id, **data.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return to_dict(r)

@app.get("/discursiva-essays")
def list_essays(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(DiscursivaEssay).filter(DiscursivaEssay.user_id == user.id)\
             .order_by(DiscursivaEssay.created_at.desc()).all()
    return [to_dict(r) for r in rows]

@app.post("/discursiva-essays", status_code=201)
def create_essay(data: DiscursivaEssayIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = DiscursivaEssay(user_id=user.id, **data.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return to_dict(r)

# ── Dashboard KPIs ────────────────────────────────────────────────────────────────
@app.get("/dashboard/kpis")
def dashboard_kpis(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    records = db.query(ProductivityRecord).filter(ProductivityRecord.user_id == user.id).all()
    questions = db.query(ExamQuestion).filter(ExamQuestion.user_id == user.id).all()
    errors = db.query(ErrorEntry).filter(ErrorEntry.user_id == user.id).all()

    subject_map: dict = {}

    def get_or_create(subject):
        if subject not in subject_map:
            subject_map[subject] = {"subject": subject, "hours": 0.0, "questions_answered": 0, "questions_wrong": 0}
        return subject_map[subject]

    for r in records:
        subs = r.subjects_json or []
        if subs:
            for s in subs:
                get_or_create(s["subject"])["hours"] += s.get("elapsed", 0) / 3600
        elif r.subject:
            get_or_create(r.subject)["hours"] += r.duration_seconds / 3600

    for q in questions:
        if q.subject:
            s = get_or_create(q.subject)
            s["questions_answered"] += q.times_answered or 0
            s["questions_wrong"] += max(0, (q.times_answered or 0) - (q.times_correct or 0))

    for e in errors:
        if e.subject:
            get_or_create(e.subject)["questions_wrong"] += 1

    subjects = sorted(subject_map.values(), key=lambda x: -x["hours"])
    total_hours = sum(s["hours"] for s in subjects)
    total_answered = sum(s["questions_answered"] for s in subjects)
    total_wrong = sum(s["questions_wrong"] for s in subjects)

    # Calendar data (last 12 weeks)
    from sqlalchemy import func as sqlfunc
    cal_data: dict = {}
    for r in records:
        if r.started_at:
            day = r.started_at.strftime("%Y-%m-%d")
            cal_data[day] = cal_data.get(day, 0) + r.duration_seconds

    return {
        "total_hours": round(total_hours, 2),
        "total_answered": total_answered,
        "total_wrong": total_wrong,
        "subjects": subjects,
        "calendar": [{"day": k, "duration_seconds": v} for k, v in sorted(cal_data.items())],
    }

# ── Export ────────────────────────────────────────────────────────────────────────
@app.get("/export/all")
def export_all(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {
        "exported_at": datetime.utcnow().isoformat(),
        "productivity_records": [to_dict(r) for r in db.query(ProductivityRecord).filter(ProductivityRecord.user_id == user.id).all()],
        "error_entries": [to_dict(r) for r in db.query(ErrorEntry).filter(ErrorEntry.user_id == user.id).all()],
        "editorial_topics": [to_dict(r) for r in db.query(EditorialTopic).filter(EditorialTopic.user_id == user.id).all()],
        "arguments": [to_dict(r) for r in db.query(Argument).filter(Argument.user_id == user.id).all()],
        "exam_questions": [to_dict(r) for r in db.query(ExamQuestion).filter(ExamQuestion.user_id == user.id).all()],
        "brain_dumps": [to_dict(r) for r in db.query(BrainDump).filter(BrainDump.user_id == user.id).all()],
        "discursiva_themes": [to_dict(r) for r in db.query(DiscursivaTheme).filter(DiscursivaTheme.user_id == user.id).all()],
        "discursiva_essays": [to_dict(r) for r in db.query(DiscursivaEssay).filter(DiscursivaEssay.user_id == user.id).all()],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# ══════════════════════════════════════════════════════════════════════════════
# MATERIAIS — Flashcards, Resumos e Mapas Mentais gerados por IA a partir de PDF
# ══════════════════════════════════════════════════════════════════════════════

import base64, httpx
from fastapi import UploadFile, File, Form

class StudyMaterial(Base):
    __tablename__ = "study_materials"
    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id       = Column(String, nullable=False, index=True)
    subject       = Column(String, nullable=False)
    title         = Column(String, nullable=False)
    source_name   = Column(String)           # nome do PDF
    page_count    = Column(Integer)
    text_preview  = Column(Text)             # primeiros 500 chars do PDF
    flashcards    = Column(JSON, default=list)   # [{front, back}, ...]
    summary       = Column(Text)
    mind_map      = Column(JSON, default=dict)   # {root, children:[{label, children}]}
    created_at    = Column(DateTime, default=func.now())
    updated_at    = Column(DateTime, default=func.now(), onupdate=func.now())

Base.metadata.create_all(bind=engine)  # cria a nova tabela sem recriar as outras

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")

async def call_claude(prompt: str, system: str = "") -> str:
    """Chama a API da Anthropic diretamente."""
    if not ANTHROPIC_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY não configurada no backend.")
    async with httpx.AsyncClient(timeout=120) as client:
        payload: dict = {
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            payload["system"] = system
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json=payload,
        )
        r.raise_for_status()
        data = r.json()
        return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")

def extract_pdf_text(pdf_bytes: bytes) -> tuple[str, int]:
    """Extrai texto do PDF usando PyMuPDF."""
    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages = doc.page_count
        text = ""
        for page in doc:
            text += page.get_text()
            if len(text) > 15000:  # limita para não explodir o contexto
                text = text[:15000] + "\n[...texto truncado para processamento...]"
                break
        doc.close()
        return text.strip(), pages
    except Exception as e:
        raise HTTPException(400, f"Erro ao processar PDF: {e}")

def safe_json(raw: str) -> any:
    """Tenta parsear JSON, removendo fences de markdown."""
    import re, json
    cleaned = re.sub(r"```json|```", "", raw).strip()
    # Tenta encontrar o primeiro objeto/array JSON válido
    for start_char, end_char in [('{', '}'), ('[', ']')]:
        start = cleaned.find(start_char)
        if start != -1:
            end = cleaned.rfind(end_char)
            if end != -1:
                try:
                    return json.loads(cleaned[start:end+1])
                except:
                    pass
    raise ValueError(f"JSON inválido: {cleaned[:200]}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/study-materials")
def list_materials(subject: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(StudyMaterial).filter(StudyMaterial.user_id == user.id)
    if subject:
        q = q.filter(StudyMaterial.subject == subject)
    rows = q.order_by(StudyMaterial.created_at.desc()).all()
    return [to_dict(r) for r in rows]

@app.get("/study-materials/{id}")
def get_material(id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(StudyMaterial).filter(StudyMaterial.id == id, StudyMaterial.user_id == user.id).first()
    if not r: raise HTTPException(404)
    return to_dict(r)

@app.delete("/study-materials/{id}", status_code=204)
def delete_material(id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(StudyMaterial).filter(StudyMaterial.id == id, StudyMaterial.user_id == user.id).first()
    if not r: raise HTTPException(404)
    db.delete(r); db.commit()

@app.post("/study-materials/upload", status_code=201)
async def upload_and_generate(
    file: UploadFile = File(...),
    subject: str = Form(...),
    title: str = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Recebe PDF, extrai texto, gera flashcards + resumo + mapa mental via IA."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Apenas arquivos PDF são aceitos.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > 20 * 1024 * 1024:  # 20 MB
        raise HTTPException(400, "PDF muito grande. Limite: 20 MB.")

    text, pages = extract_pdf_text(pdf_bytes)
    if len(text) < 50:
        raise HTTPException(400, "PDF sem texto suficiente (pode ser um PDF de imagem).")

    SYSTEM = (
        "Você é um assistente especializado em educação para concursos públicos brasileiros. "
        "Responda SEMPRE em JSON válido, sem nenhum texto fora do JSON, sem markdown, sem explicações."
    )

    # ── 1. Flashcards ────────────────────────────────────────────────────────
    fc_prompt = f"""Com base no texto abaixo, gere exatamente 12 flashcards de estudo em formato JSON.
Cada flashcard deve ter os campos "front" (pergunta ou conceito) e "back" (resposta ou definição completa).
Foque nos conceitos mais importantes para concursos públicos.

TEXTO:
{text[:8000]}

Responda APENAS com este JSON (sem texto fora):
[
  {{"front": "Pergunta ou conceito", "back": "Resposta ou definição completa"}},
  ...
]"""

    # ── 2. Resumo ────────────────────────────────────────────────────────────
    sum_prompt = f"""Com base no texto abaixo, escreva um resumo estruturado e completo para estudo de concursos públicos.
O resumo deve ter seções com títulos em markdown (##), bullet points, e destacar os pontos mais cobrados em provas.
Máximo de 800 palavras. Escreva em português.

TEXTO:
{text[:10000]}

Responda APENAS com o texto do resumo (sem JSON, pode usar markdown)."""

    # ── 3. Mapa Mental ───────────────────────────────────────────────────────
    mm_prompt = f"""Com base no texto abaixo, crie um mapa mental hierárquico em JSON.
O mapa deve ter um nó raiz e ramificações com no máximo 3 níveis de profundidade.
Cada nó tem "label" (texto curto, max 6 palavras) e "children" (array de nós filhos).

TEXTO:
{text[:6000]}

Responda APENAS com este JSON:
{{
  "label": "Tema central",
  "children": [
    {{
      "label": "Subtema 1",
      "children": [
        {{"label": "Conceito 1.1", "children": []}},
        {{"label": "Conceito 1.2", "children": []}}
      ]
    }},
    ...
  ]
}}"""

    # Executa as 3 chamadas (sequencialmente para não sobrecarregar)
    try:
        fc_raw  = await call_claude(fc_prompt, SYSTEM)
        sum_raw = await call_claude(sum_prompt, SYSTEM)
        mm_raw  = await call_claude(mm_prompt, SYSTEM)
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, f"Erro na API Anthropic: {e.response.text[:200]}")

    # Parseia respostas
    try:
        flashcards = safe_json(fc_raw)
        if not isinstance(flashcards, list): flashcards = []
    except:
        flashcards = []

    summary = sum_raw.strip()

    try:
        mind_map = safe_json(mm_raw)
        if not isinstance(mind_map, dict): mind_map = {"label": title, "children": []}
    except:
        mind_map = {"label": title, "children": []}

    # Persiste no banco
    material = StudyMaterial(
        user_id      = user.id,
        subject      = subject.strip(),
        title        = title.strip(),
        source_name  = file.filename,
        page_count   = pages,
        text_preview = text[:500],
        flashcards   = flashcards,
        summary      = summary,
        mind_map     = mind_map,
    )
    db.add(material); db.commit(); db.refresh(material)
    return to_dict(material)

@app.get("/study-materials/subjects/list")
def list_subjects(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(StudyMaterial.subject).filter(StudyMaterial.user_id == user.id).distinct().all()
    return sorted([r[0] for r in rows])
