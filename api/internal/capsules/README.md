# Time Capsule Delivery

> Deferred message delivery using Cloud Tasks and Firestore-triggered email.

## Architecture

Capsules are messages scheduled for future delivery. When a capsule is created, a Cloud Task is enqueued to call the deliver endpoint at the scheduled time. Delivery writes to the Firestore `mail` collection, which triggers the Firebase SendGrid extension to send the email.

## Delivery Types

| Type | Mechanism |
|------|-----------|
| `scheduled_date` | Cloud Task with `ScheduleTime` |
| `anniversary` | Cloud Task for next occurrence, re-enqueues after each delivery |
| `on_death` / `on_settlement` | No task — triggered by estate status listener |

## Dependencies

- Cloud Tasks API (`cloud.google.com/go/cloudtasks/apiv2`)
- Firestore `mail` collection (SendGrid extension)
- Queue: `capsule-delivery` in `us-central1`

## Configuration

| Env Var | Description | Required |
|---------|-------------|----------|
| `GCP_PROJECT_ID` | GCP project for Cloud Tasks queue path | Yes |

## Known Limitations

- Delivery URL is hardcoded to the production Cloud Run endpoint
- Anniversary re-enqueue relies on successful delivery — if delivery fails, the chain breaks
