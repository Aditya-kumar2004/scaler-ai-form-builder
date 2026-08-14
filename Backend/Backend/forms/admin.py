from django.contrib import admin
from .models import Form, Question, QuestionOption, Response, Answer


# Register your models here.

@admin.register(Form)
class FormAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "status", "created_at", "updated_at")
    list_filter = ("status", "created_at")
    search_fields = ("title", "description")


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "form", "question_text", "question_type", "required", "order")
    list_filter = ("question_type", "required", "form")
    search_fields = ("question_text",)


@admin.register(QuestionOption)
class QuestionOptionAdmin(admin.ModelAdmin):
    list_display = ("id", "question", "option_text", "order")
    search_fields = ("option_text",)


@admin.register(Response)
class ResponseAdmin(admin.ModelAdmin):
    list_display = ("id", "form", "submitted_at")
    list_filter = ("form", "submitted_at")


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "response", "question", "answer_text")
    search_fields = ("answer_text",)
