from fastapi import FastAPI

app = FastAPI(
    title="CareQueue API",
    description="Backend starter for the CareQueue project.",
    version="0.1.0",
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"status": "ok", "service": "CareQueue API"}
