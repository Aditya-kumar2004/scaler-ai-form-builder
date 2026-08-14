from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Form, Question, QuestionOption, Response as ResponseModel, Answer
from .serializers import (
    FormSerializer,
    QuestionSerializer,
    QuestionOptionSerializer,
    PublicFormSerializer,
    ResponseSerializer,
    SubmitResponseSerializer,
)


# ==========================================
# FORM API VIEWS
# ==========================================

@api_view(["GET", "POST"])
def forms(request):
    """
    GET /api/forms/ - List all forms
    POST /api/forms/ - Create a new form
    """
    if request.method == "GET":
        forms_list = Form.objects.all()
        serializer = FormSerializer(forms_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == "POST":
        serializer = FormSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
def form_detail(request, form_id):
    """
    GET /api/forms/<id>/ - Retrieve a form by ID
    PUT /api/forms/<id>/ - Update a form
    DELETE /api/forms/<id>/ - Delete a form
    """
    try:
        form = Form.objects.get(id=form_id)
    except Form.DoesNotExist:
        return Response({"detail": "Form not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = FormSerializer(form)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == "PUT":
        serializer = FormSerializer(form, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        form.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
def publish_form(request, form_id):
    """
    POST /api/forms/<id>/publish/ - Change form status to 'published'
    """
    try:
        form = Form.objects.get(id=form_id)
    except Form.DoesNotExist:
        return Response({"detail": "Form not found."}, status=status.HTTP_404_NOT_FOUND)

    form.status = "published"
    form.save()

    serializer = FormSerializer(form)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
def unpublish_form(request, form_id):
    """
    POST /api/forms/<id>/unpublish/ - Change form status to 'draft'
    """
    try:
        form = Form.objects.get(id=form_id)
    except Form.DoesNotExist:
        return Response({"detail": "Form not found."}, status=status.HTTP_404_NOT_FOUND)

    form.status = "draft"
    form.save()

    serializer = FormSerializer(form)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
def public_form(request, form_id):
    """
    GET /api/forms/<id>/public/ - Get published form details with questions and options
    """
    try:
        form = Form.objects.get(id=form_id)
    except Form.DoesNotExist:
        return Response({"detail": "Form not found."}, status=status.HTTP_404_NOT_FOUND)

    if form.status != "published":
        return Response(
            {"detail": "This form is not published."},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = PublicFormSerializer(form)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
def form_statistics(request, form_id):
    """
    GET /api/forms/<id>/statistics/ - Get response statistics for a form
    """
    try:
        form = Form.objects.get(id=form_id)
    except Form.DoesNotExist:
        return Response({"detail": "Form not found."}, status=status.HTTP_404_NOT_FOUND)

    questions = form.questions.all().order_by("order")
    result = []

    for question in questions:
        answers = Answer.objects.filter(
            question=question,
            response__form=form
        )

        question_data = {
            "question_id": question.id,
            "question_text": question.question_text,
            "question_type": question.question_type,
            "total_answers": answers.count(),
        }

        if question.question_type in [
            "multiple_choice",
            "dropdown",
            "yes_no",
            "rating"
        ]:
            counts = (
                answers
                .values("answer_text")
                .annotate(count=Count("id"))
                .order_by("-count")
            )

            question_data["statistics"] = [
                {
                    "answer": item["answer_text"],
                    "count": item["count"]
                }
                for item in counts
            ]

        result.append(question_data)

    return Response({
        "form_id": form.id,
        "form_title": form.title,
        "total_responses": form.responses.count(),
        "questions": result
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
def duplicate_form(request, form_id):
    """
    POST /api/forms/<id>/duplicate/ - Duplicate a form, its questions, and question options
    """
    try:
        original_form = Form.objects.get(id=form_id)
    except Form.DoesNotExist:
        return Response({"detail": "Form not found."}, status=status.HTTP_404_NOT_FOUND)

    # Create a new form as draft with 0 responses
    new_form = Form.objects.create(
        title=f"{original_form.title} Copy",
        description=original_form.description,
        status="draft"
    )

    # Duplicate questions
    original_questions = original_form.questions.all().order_by("order")

    for question in original_questions:
        new_question = Question.objects.create(
            form=new_form,
            question_text=question.question_text,
            question_type=question.question_type,
            description=question.description,
            required=question.required,
            order=question.order
        )

        # Duplicate options
        original_options = question.options.all().order_by("order")

        for option in original_options:
            QuestionOption.objects.create(
                question=new_question,
                option_text=option.option_text,
                order=option.order
            )

    serializer = FormSerializer(new_form)
    return Response(
        serializer.data,
        status=status.HTTP_201_CREATED
    )


@api_view(["PATCH"])
def reorder_questions(request, form_id):
    """
    PATCH /api/forms/<id>/reorder-questions/ - Update the display order of questions
    """
    try:
        form = Form.objects.get(id=form_id)
    except Form.DoesNotExist:
        return Response({"detail": "Form not found."}, status=status.HTTP_404_NOT_FOUND)

    questions_data = request.data.get("questions")

    if not questions_data:
        return Response(
            {"detail": "Questions list is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    question_ids = [
        item.get("id")
        for item in questions_data
    ]

    # Check that all questions belong to this form
    form_question_ids = set(
        form.questions.values_list(
            "id",
            flat=True
        )
    )

    if set(question_ids) != form_question_ids:
        return Response(
            {"detail": "Invalid question list for this form."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update order
    for item in questions_data:
        question = Question.objects.get(
            id=item["id"],
            form=form
        )
        question.order = item["order"]
        question.save(update_fields=["order"])

    return Response(
        {"message": "Questions reordered successfully."},
        status=status.HTTP_200_OK
    )

# QUESTION API VIEWS


@api_view(["GET", "POST"])
def questions(request):
    """
    GET /api/questions/ - List all questions
    POST /api/questions/ - Create a new question
    """
    if request.method == "GET":
        question_list = Question.objects.all()
        serializer = QuestionSerializer(question_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == "POST":
        serializer = QuestionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


#QUESTION DETAIL API VIEW
@api_view(["GET", "PUT", "DELETE"])
def question_detail(request, question_id):
    """
    GET /api/questions/<id>/ - Retrieve a question
    PUT /api/questions/<id>/ - Update a question
    DELETE /api/questions/<id>/ - Delete a question
    """
    try:
        question = Question.objects.get(id=question_id)
    except Question.DoesNotExist:
        return Response({"detail": "Question not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = QuestionSerializer(question)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == "PUT":
        serializer = QuestionSerializer(question, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        question.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)



# QUESTION OPTION API VIEWS

@api_view(["GET", "POST"])
def options(request):
    """
    GET /api/options/ - List all question options
    POST /api/options/ - Create a new question option
    """
    if request.method == "GET":
        option_list = QuestionOption.objects.all()
        serializer = QuestionOptionSerializer(option_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == "POST":
        serializer = QuestionOptionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
def option_detail(request, option_id):
    """
    GET /api/options/<id>/ - Retrieve a question option
    PUT /api/options/<id>/ - Update a question option
    DELETE /api/options/<id>/ - Delete a question option
    """
    try:
        option = QuestionOption.objects.get(id=option_id)
    except QuestionOption.DoesNotExist:
        return Response({"detail": "Question option not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        serializer = QuestionOptionSerializer(option)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == "PUT":
        serializer = QuestionOptionSerializer(option, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        option.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==========================================
# RESPONSE API VIEWS
# ==========================================

@api_view(["GET"])
def responses(request):
    """
    GET /api/responses/ - List all responses
    """
    response_list = ResponseModel.objects.all()
    serializer = ResponseSerializer(response_list, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
def response_detail(request, response_id):
    """
    GET /api/responses/<id>/ - Retrieve a single response
    """
    try:
        response_obj = ResponseModel.objects.get(id=response_id)
    except ResponseModel.DoesNotExist:
        return Response({"detail": "Response not found."}, status=status.HTTP_404_NOT_FOUND)

    serializer = ResponseSerializer(response_obj)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
def submit_response(request):
    """
    POST /api/responses/submit/ - Submit a response with answers to a published form
    """
    serializer = SubmitResponseSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    form_id = serializer.validated_data["form"]
    answers = serializer.validated_data["answers"]

    try:
        form = Form.objects.get(
            id=form_id,
            status="published"
        )
    except Form.DoesNotExist:
        return Response(
            {"detail": "Published form not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    response_obj = ResponseModel.objects.create(form=form)

    for answer in answers:
        Answer.objects.create(
            response=response_obj,
            question_id=answer["question"],
            answer_text=answer["answer_text"]
        )

    return Response(
        {
            "message": "Response submitted successfully.",
            "response_id": response_obj.id
        },
        status=status.HTTP_201_CREATED
    )

@api_view(["GET"])
def form_responses(request, form_id):

    try:
        form = Form.objects.get(id=form_id)

    except Form.DoesNotExist:

        return Response(
            {
                "detail": "Form not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    responses = ResponseModel.objects.filter(
        form=form
    ).order_by("-submitted_at")

    serializer = ResponseSerializer(
        responses,
        many=True
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )