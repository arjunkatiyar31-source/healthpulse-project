# Database Design

Database: `healthpulse_web` (MySQL)

```mermaid
erDiagram
    USERS ||--o| DOCTORS : "is a"
    USERS ||--o| PATIENTS : "is a"
    DOCTORS ||--o{ APPOINTMENTS : "receives"
    PATIENTS ||--o{ APPOINTMENTS : "books"
    PATIENTS ||--o{ MEDICAL_RECORDS : "has"
    DOCTORS ||--o{ MEDICAL_RECORDS : "writes"
    DOCTORS ||--o{ FEEDBACK : "receives"
    PATIENTS ||--o{ FEEDBACK : "gives"

    USERS {
        int id PK
        varchar name
        varchar email UK
        varchar password
        enum role "ADMIN, DOCTOR, PATIENT"
        timestamp created_at
    }
    DOCTORS {
        int id PK
        int user_id FK
        varchar specialty
        text bio
    }
    PATIENTS {
        int id PK
        int user_id FK
        date date_of_birth
        varchar contact
        varchar gender
        varchar blood_group
        decimal height_cm
        decimal weight_kg
        varchar address
        text allergies
        text chronic_conditions
        varchar emergency_contact_name
        varchar emergency_contact_phone
    }
    APPOINTMENTS {
        int id PK
        int doctor_id FK
        int patient_id FK
        date appointment_date
        time appointment_time
        enum status "PENDING, CONFIRMED, COMPLETED, CANCELLED"
        text notes
        timestamp created_at
    }
    MEDICAL_RECORDS {
        int id PK
        int patient_id FK
        int doctor_id FK
        text diagnosis
        text prescription
        timestamp record_date
    }
    FEEDBACK {
        int id PK
        int doctor_id FK
        int patient_id FK
        int rating
        text comment
        timestamp created_at
    }
    SETTINGS {
        varchar setting_key PK
        varchar setting_value
    }
```

## Design notes

- A user's role decides which profile table holds their extra details: `doctors` or `patients`. Admins have none.
- Deleting a user cascades to their doctor or patient record and everything linked to it.
- Age and BMI are calculated when read and are never stored, so they can't go stale.