# CareQueue Backend Architecture

## High-Level Architecture

CareQueue backend is a FastAPI service that manages clinic queues, staff actions, patient token status, real-time updates, and AI-assisted predictions.

Core layers:

- FastAPI backend for REST APIs and SSE streams
- MongoDB for clinics, staff, doctors, queue tokens, notifications, and reviews
- SSE real-time updates for queue changes
- AI layer for clinic recommendation, wait prediction, patient parsing, and assistant responses

## Data Flow

```text
Patient -> API -> Queue -> SSE -> Frontend
```

1. Patient joins a clinic queue through the API.
2. API creates or updates a `queue_tokens` document.
3. Queue position and ETA are recalculated.
4. Backend broadcasts queue changes through SSE.
5. Patient, doctor, receptionist, and display screens update live.

## Queue Tokens

`queue_tokens` is the hot collection. Most real-time reads and writes hit this collection because token status, position, ETA, and consultation timing change frequently during clinic operations.

Important indexes:

- `clinic_id + date`
- `status`
- `position`

## ETA + SSE System

ETA is recalculated whenever queue state changes, such as join, call next, skip, emergency, consultation start, consultation complete, doctor delay, or doctor availability change.

Basic ETA inputs:

- Number of patients before the token
- Doctor average consultation time
- Current consultation remaining time
- Doctor delay minutes
- Clinic delay buffer

After ETA changes, the backend emits SSE events such as:

- `queue_updated`
- `token_called`
- `wait_time_changed`
- `doctor_status_changed`
- `emergency_added`
