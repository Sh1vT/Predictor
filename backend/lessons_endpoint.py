from fastapi import APIRouter
from lessons import lessons

router = APIRouter()

@router.get("/api/lessons")
async def get_lessons():
    print("Lessons data:", lessons)  # Debug print
    return lessons 