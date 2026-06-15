from openai import OpenAI
import json
from typing import Dict, Any, List
from pydantic import BaseModel
from backend.app.config import settings

class OpenAIClient:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def extract_fields(self, model: type[BaseModel], current_fields: Dict[str, Any], messages: List[Dict[str, str]]) -> Dict[str, Any]:
        # Generate structured extraction schema
        schema = model.model_json_schema()
        system_prompt = (
            f"You are a security data extraction assistant. Your job is to analyze the conversation history "
            f"and extract inputs matching this JSON Schema:\n{json.dumps(schema)}\n\n"
            f"Current extracted values so far: {json.dumps(current_fields)}.\n"
            f"Only extract field values if they are explicitly mentioned and clear. Do not invent or assume values. "
            f"Output ONLY a raw JSON object containing the new or updated field values."
        )
        
        # Format conversation for LLM
        chat_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            chat_messages.append({"role": msg["role"], "content": msg["content"]})
            
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=chat_messages,
                response_format={"type": "json_object"},
                temperature=0.0
            )
            content = response.choices[0].message.content
            return json.loads(content) if content else {}
        except Exception as e:
            # Fallback to current fields on error
            return {}

    def generate_follow_up(self, missing_field: str, field_description: str, messages: List[Dict[str, str]]) -> str:
        system_prompt = (
            f"You are a friendly, helpful security team assistant. We are collecting information for a security review.\n"
            f"The field '{missing_field}' (described as: '{field_description}') is missing.\n"
            f"Ask the user one polite, conversational question to gather ONLY this missing field. "
            f"Do not ask for any other information. Keep it short."
        )
        
        chat_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            chat_messages.append({"role": msg["role"], "content": msg["content"]})
            
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=chat_messages,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Please provide the required information for: {field_description}."

    def generate_final_response(self, workflow_name: str, status: str, rationale: str, metadata: Dict[str, Any], messages: List[Dict[str, str]]) -> str:
        system_prompt = (
            f"You are a friendly security team assistant. A security request under workflow '{workflow_name}' has been evaluated.\n"
            f"Status: {status}\n"
            f"Rationale: {rationale}\n"
            f"In-depth security metadata: {json.dumps(metadata)}\n\n"
            f"Write a friendly, professional response informing the user of the final decision and explaining the rationale in detail."
        )
        
        chat_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            chat_messages.append({"role": msg["role"], "content": msg["content"]})
            
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=chat_messages,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Your request has been {status}. Rationale: {rationale}."
