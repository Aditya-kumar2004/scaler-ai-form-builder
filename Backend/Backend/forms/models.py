from django.db import models

# Create your models here.

#This is first table which i have made in my forms app for making forms 
#like

#name,title, description,email,number,gender
#title and description is same in both the tables
class Form(models.Model):

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
    ]

    title = models.CharField(max_length=255)

    description = models.TextField(
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.title

#This is second table which is connected to first table which is connected to first table

class Question(models.Model):

    QUESTION_TYPES = [
        ("short_text", "Short Text"),
        ("long_text", "Long Text"),
        ("multiple_choice", "Multiple Choice"),
        ("dropdown", "Dropdown"),
        ("email", "Email"),
        ("number", "Number"),
        ("yes_no", "Yes/No"),
        ("rating", "Rating"),
    ]

    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name="questions"
    )

    question_text = models.TextField()

    question_type = models.CharField(
        max_length=30,
        choices=QUESTION_TYPES
    )

    description = models.TextField(
        blank=True,
        null=True
    )

    required = models.BooleanField(
        default=False
    )

    order = models.PositiveIntegerField(
        default=0
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.question_text

#This function is for Multiple-choice and dropdown questions need options 
class QuestionOption(models.Model):

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="options"
    )

    option_text = models.CharField(
        max_length=255
    )

    order = models.PositiveIntegerField(
        default=0
    )

    def __str__(self):
        return self.option_text

#This is the fourth table which is connected to first table 
class Response(models.Model):

    form = models.ForeignKey(
        Form,
        on_delete=models.CASCADE,
        related_name="responses"
    )

    submitted_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"Response {self.id}"

#This is the function which is connected to first and second and third table 
# and this is form answer for which question type answer is this so this is answer table 
class Answer(models.Model):

    response = models.ForeignKey(
        Response,
        on_delete=models.CASCADE,
        related_name="answers"
    )

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE
    )

    answer_text = models.TextField()

    def __str__(self):
        return self.answer_text