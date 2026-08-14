# Scaler AI Form Builder

Scaler AI Form Builder is a full-stack, Typeform-style web application built for creating dynamic forms and collecting responses.

The project allows form creators to build, reorder, customize, and publish forms through an administrative dashboard, while respondents can fill out published forms through a clean, one-question-at-a-time interface via a public link.

---

## Features

### Creator / Admin Features

- **Dashboard**: View all created forms, their publication status (`draft` or `published`), and total response count.
- **Form Management**: Create new forms, edit form titles and descriptions, duplicate existing forms with all their questions and options, and delete forms.
- **Publish & Unpublish**: Toggle form availability between draft mode and public access.
- **Form Builder**:
  - Add new questions to any form.
  - Edit question text, descriptions, and question types.
  - Delete individual questions.
  - Mark questions as required or optional.
  - Add and delete options for choice-based questions (Multiple Choice and Dropdown).
  - **Question Reordering**: Reorder questions with automatic order persistence in the database.
- **Share Public Forms**: Generate and copy direct shareable links to published forms.
- **View Responses**: View submitted form responses and individual answer details.

### Respondent Features

- **Public Form Access**: Access published forms directly using a public URL (`/forms/[id]`).
- **Dynamic Form Rendering**: The frontend loads the form structure and question list from the Django backend dynamically.
- **One-Question-At-A-Time Flow**: Clean, focused interface showing one question at a time with smooth step-by-step navigation.
- **Navigation Controls**: Use **Next** and **Previous** buttons to move back and forth between questions.
- **State Persistence**: Entered answers are saved in state while navigating across questions.
- **Input Validation**:
  - Enforces completion of required questions before proceeding.
  - Validates input formats for email, number, and rating fields.
- **Submission Confirmation**: Shows a clear success message after the response is submitted.

### Supported Question Types

The application supports the following question types:

1. **Short Text**: Single-line text input for short answers.
2. **Long Text**: Multi-line textarea for detailed feedback.
3. **Multiple Choice**: Single-select options from a custom list.
4. **Dropdown**: Dropdown selection menu from a custom list.
5. **Email**: Text field with email format validation.
6. **Number**: Numerical input with number validation.
7. **Rating**: 1 to 5 rating selection.
8. **Yes / No**: Binary choice selection.

---

## Tech Stack

| Part | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | User interface, page routing, and state management |
| **Styling** | Tailwind CSS 4 | Responsive design and component styling |
| **Backend** | Python, Django 6.1, Django REST Framework 3.18 | REST API development, business logic, and validation |
| **CORS** | django-cors-headers 5.1 | Cross-Origin Resource Sharing handling |
| **Database** | SQLite | Relational database storage |
| **Tools** | Postman, Git, GitHub | API testing and version control |

---

## Architecture

```text
User / Respondent
      │
      ▼
Next.js Frontend (React / TypeScript)
      │
      │ REST API / JSON
      ▼
Django REST Framework (Python)
      │
      ▼
SQLite Database
```

### Explanation:

- **Frontend (Next.js)**: Responsible for rendering the dashboard, the visual form builder, and the respondent form view. It manages client-side form state and makes HTTP requests to the backend API.
- **Backend (Django REST Framework)**: Handles business logic, input validation, serialization, database queries, and provides RESTful endpoints.
- **Database (SQLite)**: Stores relational data including forms, questions, choice options, submitted responses, and individual answers.

---

## Project Structure

```text
Scaler Ai Labs/
├── Backend/
│   └── Backend/
│       ├── backend/              # Django project configuration
│       │   ├── settings.py       # App settings and CORS configuration
│       │   ├── urls.py           # Main routing entry point
│       │   └── wsgi.py           # WSGI configuration
│       ├── forms/                # Core forms application
│       │   ├── admin.py          # Django admin configuration
│       │   ├── models.py         # Form, Question, Option, Response models
│       │   ├── serializers.py    # DRF ModelSerializers
│       │   ├── urls.py           # API endpoint routes
│       │   └── views.py          # API view functions
│       ├── db.sqlite3            # SQLite database file
│       ├── manage.py             # Django management script
│       └── requirements.txt      # Python dependencies
│
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Creator Dashboard
│   │   ├── forms/
│   │   │   └── [id]/
│   │   │       ├── builder/
│   │   │       │   └── page.tsx  # Visual Form Builder
│   │   │       ├── responses/
│   │   │       │   └── page.tsx  # Responses list & detail page
│   │   │       └── page.tsx      # Public Respondent Form
│   │   ├── globals.css           # Global Tailwind CSS styles
│   │   ├── layout.tsx            # App root layout
│   │   └── page.tsx              # Home overview page
│   ├── public/                   # Static assets
│   ├── .env.local                # Frontend environment variables
│   ├── next.config.ts            # Next.js configuration
│   ├── package.json              # NPM dependencies and scripts
│   └── tsconfig.json             # TypeScript configuration
│
└── README.md
```

---

## Local Setup

### 1. Backend Setup (Django)

1. Open a terminal and change to the backend directory:
   ```bash
   cd "Backend/Backend"
   ```

2. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - **Windows**:
     ```bash
     venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

4. Install the Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Apply database migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the Django backend server:
   ```bash
   python manage.py runserver
   ```
   *The backend will run at `http://127.0.0.1:8000`.*

---

### 2. Frontend Setup (Next.js)

1. Open another terminal and change to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the required Node.js packages:
   ```bash
   npm install
   ```

3. Create the environment configuration file:
   Create a file named `.env.local` inside the `frontend/` directory with the following content:
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *The frontend will run at `http://localhost:3000`.*

---

## Environment Variables

The frontend uses the following environment variable:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

- **Purpose**: Defines the base URL for the Django REST API so that backend URLs are not hard-coded across frontend components.
- **Security Note**: Never commit `.env.local` or secret credentials to version control.

---

## API Documentation

Base URL: `http://127.0.0.1:8000/api`

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/forms/` | List all forms with question and response counts |
| `POST` | `/forms/` | Create a new form |
| `GET` | `/forms/<id>/` | Retrieve a single form with all questions and options |
| `PUT` | `/forms/<id>/` | Update form title or description |
| `DELETE` | `/forms/<id>/` | Delete a form |
| `POST` | `/forms/<id>/publish/` | Change form status to `published` |
| `POST` | `/forms/<id>/unpublish/` | Change form status to `draft` |
| `POST` | `/forms/<id>/duplicate/` | Duplicate a form along with its questions and options |
| `GET` | `/forms/<id>/public/` | Retrieve a published form for public respondents |
| `PATCH` | `/forms/<id>/reorder-questions/` | Update the display order of questions |
| `GET` | `/forms/<id>/statistics/` | Retrieve aggregated answer statistics for a form |
| `GET` | `/forms/<id>/responses/` | List all submitted responses for a form |
| `GET` | `/questions/` | List all questions across forms |
| `POST` | `/questions/` | Create a new question |
| `GET` | `/questions/<id>/` | Retrieve a single question |
| `PUT` | `/questions/<id>/` | Update question text, type, description, or required status |
| `DELETE` | `/questions/<id>/` | Delete a question |
| `GET` | `/options/` | List all question options |
| `POST` | `/options/` | Add a new option to a question |
| `GET` | `/options/<id>/` | Retrieve an option by ID |
| `PUT` | `/options/<id>/` | Update option text or order |
| `DELETE` | `/options/<id>/` | Delete an option |
| `POST` | `/responses/submit/` | Submit a respondent's answers |
| `GET` | `/responses/` | List all submitted responses |
| `GET` | `/responses/<id>/` | Retrieve an individual response with its answers |

---

## Important API Examples

### 1. Get Public Form
- **Endpoint**: `GET /api/forms/1/public/`
- **Description**: Returns form metadata, questions, and options only if the form is published.

**Response (`200 OK`):**
```json
{
  "id": 1,
  "title": "Feedback Survey",
  "description": "Please share your experience with us.",
  "status": "published",
  "questions": [
    {
      "id": 10,
      "question_text": "How would you rate our platform?",
      "question_type": "rating",
      "description": "Select from 1 to 5",
      "required": true,
      "order": 1,
      "options": []
    },
    {
      "id": 11,
      "question_text": "Which feature do you use the most?",
      "question_type": "multiple_choice",
      "description": "",
      "required": true,
      "order": 2,
      "options": [
        { "id": 101, "option_text": "Form Builder", "order": 1 },
        { "id": 102, "option_text": "Responses Analytics", "order": 2 }
      ]
    }
  ]
}
```

*If the form is in `draft` status or does not exist, the API returns `404 NOT FOUND`.*

---

### 2. Submit Response
- **Endpoint**: `POST /api/responses/submit/`
- **Description**: Submits a respondent's answers for a published form and stores them in the database.

**Request Body:**
```json
{
  "form": 1,
  "answers": [
    {
      "question": 10,
      "answer_text": "5"
    },
    {
      "question": 11,
      "answer_text": "Form Builder"
    }
  ]
}
```

**Response (`201 CREATED`):**
```json
{
  "message": "Response submitted successfully.",
  "response_id": 12
}
```

---

### 3. Reorder Questions
- **Endpoint**: `PATCH /api/forms/1/reorder-questions/`
- **Description**: Updates the numeric display order for questions in a single request.

**Request Body:**
```json
{
  "questions": [
    { "id": 11, "order": 1 },
    { "id": 10, "order": 2 }
  ]
}
```

**Response (`200 OK`):**
```json
{
  "message": "Questions reordered successfully."
}
```

---

## How the Application Works

### Creator Flow

1. **Open Dashboard**: Creator visits `/dashboard` to see existing forms.
2. **Create Form**: Creator clicks "Create Form", inputs a title and description, and creates a draft form.
3. **Build Questions**: Creator clicks "Build" to open `/forms/[id]/builder`.
4. **Configure Fields**: Creator selects question types (e.g., Short Text, Rating, Multiple Choice), sets required flags, and adds options for choice-based questions.
5. **Reorder Questions**: Creator adjusts question order using the position controls.
6. **Publish Form**: Creator returns to the dashboard and clicks "Publish".
7. **Share Form**: Creator clicks "Share" to copy the public URL (`/forms/[id]`).
8. **Review Submissions**: Creator navigates to `/forms/[id]/responses` to see all collected answers.

### Respondent Flow

1. **Access Link**: Respondent opens the public link (`/forms/[id]`).
2. **Fetch Schema**: Next.js requests the form definition from `GET /api/forms/<id>/public/`.
3. **Display Question**: The form presents one question at a time.
4. **Answer Question**: The respondent enters an answer and clicks "Next".
5. **Validation**: The frontend checks that required fields are filled and values are valid.
6. **Navigate**: The respondent can use "Previous" to review or update earlier answers without losing input state.
7. **Submit**: On the final question, the respondent clicks "Submit".
8. **Store Response**: The frontend sends the answers to `POST /api/responses/submit/`.
9. **Success**: Django validates and records the response, and Next.js displays the completion screen.

---

## Validation

The application includes validation at both frontend and backend levels:

- **Required Fields**: Respondents cannot advance past or submit required questions without providing an answer.
- **Email Validation**: Email fields validate email formatting before proceeding.
- **Number Validation**: Number fields ensure only numeric inputs are accepted.
- **Rating Validation**: Rating fields restrict answers to the valid 1 to 5 range.
- **Form Status Checks**: The public endpoint (`/public/`) will only serve forms marked as `published`.
- **Integrity Validation**: The backend checks that all answer submissions reference valid, existing question IDs.

---

## Testing

The project has been tested through manual workflows and API testing:

- **Postman API Testing**:
  - Verified CRUD operations on forms, questions, and options.
  - Verified publishing and unpublishing state changes.
  - Verified that unpublished forms return a 404 on the public API endpoint.
  - Verified successful response submission and response retrieval endpoints.
  - Verified question reordering requests and order persistence.
- **Browser & End-to-End Testing**:
  - Verified full creator workflow from form creation to question management.
  - Verified responsive respondent flow in normal and private browsing modes.
  - Verified that Next.js builds with zero TypeScript errors or ESLint warnings (`next build`).

---

## Key Design Decisions

- **Next.js App Router**: Provides clean file-based routing (`/dashboard`, `/forms/[id]`, `/forms/[id]/builder`, `/forms/[id]/responses`) and fast client-side navigation.
- **Django REST Framework**: Simplifies building robust RESTful APIs with built-in serialization and validation.
- **SQLite Database**: Lightweight and self-contained database choice suitable for local development and review.
- **Dynamic Input Rendering**: The frontend dynamically determines the input component to render based on the `question_type` property returned from the backend.
- **Dedicated Public Form API**: Isolates public respondent data from internal admin endpoints, preventing unpublished drafts from being accessed publicly.

---

## Security and Good Practices

- **Backend Validation**: Incoming response submissions are validated by Django REST serializers.
- **Configurable Environment Variables**: API endpoints are loaded from `NEXT_PUBLIC_API_URL` rather than hardcoded URLs.
- **CORS Protection**: Django explicitly configures allowed origins through `django-cors-headers`.
- **Version Control Cleanliness**: Sensitive environment files (`.env.local`) and temporary build artifacts are ignored via `.gitignore`.

---

## Assumptions

- The project is designed and configured for the Scaler AI Labs full-stack form builder assignment.
- SQLite is used for local development and assignment demonstration.
- Public forms can be accessed and submitted by any respondent with the valid URL when published.

---

## Known Limitations

At the time of submission, no known blockers were found in the implemented assignment flow.

---

## Deployment

Deployment URLs will be added after deployment:

- **Frontend Deployment**: `TODO: Add deployed frontend URL`
- **Backend Deployment**: `TODO: Add deployed backend URL`

---

## Submission

- **GitHub Repository**: Complete codebase containing both frontend and backend.
- **Documentation**: Detailed setup instructions, architecture breakdown, and API documentation in this `README.md`.
- **Source Code**:
  - `Backend/Backend/` (Django + DRF backend)
  - `frontend/` (Next.js + Tailwind CSS frontend)

---

## Evaluation / Interview Points

During technical evaluation, the following topics can be discussed:

1. **Client-Server Architecture**: Decoupled Next.js client communicating over REST APIs with Django.
2. **Relational Data Model**: Structured relationships across `Form`, `Question`, `QuestionOption`, `Response`, and `Answer` models.
3. **Form Duplication Logic**: Backend implementation that duplicates a form, its questions, and their options in a single request.
4. **Question Reordering**: Batch reordering of question sequences via a dedicated `PATCH` endpoint.
5. **State Management**: Managing active question indices and answer state in React during multi-step form completion.
