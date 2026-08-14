from django.urls import path

from .views import (
    forms,
    form_detail,
    publish_form,
    unpublish_form,
    duplicate_form,
    public_form,
    form_statistics,
    reorder_questions,
    questions,
    question_detail,
    options,
    option_detail,
    responses,
    response_detail,
    submit_response,
    form_responses,
)

urlpatterns = [
    # Form endpoints
    path("forms/", forms),
    path("forms/<int:form_id>/", form_detail),
    path("forms/<int:form_id>/publish/", publish_form),
    path("forms/<int:form_id>/unpublish/", unpublish_form),
    path("forms/<int:form_id>/duplicate/", duplicate_form),
    path("forms/<int:form_id>/public/", public_form),
    path("forms/<int:form_id>/statistics/", form_statistics),
    path("forms/<int:form_id>/reorder-questions/", reorder_questions),
    path("forms/<int:form_id>/responses/", form_responses),

    # Question endpoints
    path("questions/", questions),
    path("questions/<int:question_id>/", question_detail),

    # Option endpoints
    path("options/", options),
    path("options/<int:option_id>/", option_detail),

    # Response endpoints
    path("responses/submit/", submit_response),
    path("responses/", responses),
    path("responses/<int:response_id>/", response_detail),
]