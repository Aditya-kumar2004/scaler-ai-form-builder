from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from rest_framework import serializers
from .models import Form, Question, QuestionOption, Response, Answer


# QUESTION OPTION SERIALIZERS


class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = [
            "id",
            "question",
            "option_text",
            "order",
        ]


class PublicOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = [
            "id",
            "option_text",
            "order",
        ]



# QUESTION SERIALIZERS


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            "id",
            "form",
            "question_text",
            "question_type",
            "description",
            "required",
            "order",
            "created_at",
        ]


class PublicQuestionSerializer(serializers.ModelSerializer):
    options = PublicOptionSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Question
        fields = [
            "id",
            "question_text",
            "question_type",
            "description",
            "required",
            "order",
            "options",
        ]



# FORM SERIALIZERS


class FormSerializer(serializers.ModelSerializer):
    response_count = serializers.IntegerField(source="responses.count", read_only=True)
    questions = PublicQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Form
        fields = [
            "id",
            "title",
            "description",
            "status",
            "response_count",
            "questions",
            "created_at",
            "updated_at",
        ]


class PublicFormSerializer(serializers.ModelSerializer):
    questions = PublicQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Form
        fields = [
            "id",
            "title",
            "description",
            "questions",
        ]



# ANSWER & RESPONSE SERIALIZERS


class AnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source="question.question_text", read_only=True)

    class Meta:
        model = Answer
        fields = [
            "id",
            "question",
            "question_text",
            "answer_text",
        ]
#This is the serializers for the Response model
#This is for data converting from python objects to JSON format for the APIs
#and vice versa so that we can easily create/update/retrieve/delete forms and questions 
class ResponseSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Response
        fields = [
            "id",
            "form",
            "submitted_at",
            "answers",
        ]

#This is the serializer for individual submitted answers
class SubmitAnswerSerializer(serializers.Serializer):
    question = serializers.IntegerField()
    answer_text = serializers.CharField(allow_blank=True, required=False, default="")


class SubmitResponseSerializer(serializers.Serializer):
    form = serializers.IntegerField()
    answers = SubmitAnswerSerializer(many=True)

    def validate(self, data):

        form_id = data["form"]

        # 1. Check that the form exists and is published
        try:
            form = Form.objects.get(
                id=form_id,
                status="published"
            )
        except Form.DoesNotExist:
            raise serializers.ValidationError(
                "Published form not found."
            )

        # Get all questions belonging to this form
        questions = Question.objects.filter(
            form=form
        )

        question_map = {
            question.id: question
            for question in questions
        }

        submitted_question_ids = set()

        # Validate submitted answers
        for answer in data["answers"]:
            question_id = answer["question"]
            answer_text = answer["answer_text"]

            if question_id not in question_map:
                raise serializers.ValidationError(
                    f"Question {question_id} does not belong to this form."
                )

            #Prevent answering same question twice
            if question_id in submitted_question_ids:
                raise serializers.ValidationError(
                    f"Question {question_id} was answered more than once."
                )

            submitted_question_ids.add(question_id)
            question = question_map[question_id]

            #Email validation

            if question.question_type == "email":
                try:
                    validate_email(answer_text)
                except ValidationError:
                    raise serializers.ValidationError(
                        f"Invalid email for question {question_id}."
                    )

            #Number validation

            if question.question_type == "number":
                try:
                    float(answer_text)
                except (ValueError, TypeError):
                    raise serializers.ValidationError(
                        f"Invalid number for question {question_id}."
                    )

            #Rating validation  

            if question.question_type == "rating":
                try:
                    rating = int(answer_text)
                except (ValueError, TypeError):
                    raise serializers.ValidationError(
                        f"Rating must be a number from 1 to 5."
                    )

                if rating < 1 or rating > 5:
                    raise serializers.ValidationError(
                        f"Rating must be between 1 and 5."
                    )

            #Yes/No validation

            if question.question_type == "yes_no":
                if answer_text.lower() not in ["yes", "no"]:
                    raise serializers.ValidationError(
                        f"Answer must be yes or no for question {question_id}."
                    )

            if question.question_type in ["multiple_choice", "dropdown"]:
                valid_options = question.options.values_list(
                    "option_text",
                    flat=True
                )
                if answer_text not in valid_options:
                    raise serializers.ValidationError(
                        f"Invalid option for question {question_id}."
                    )

        # Required question validation
        for question in questions:
            if question.required:
                if question.id not in submitted_question_ids:
                    raise serializers.ValidationError(
                        f"Question {question.id} is required."
                    )

        return data