from abc import ABC, abstractmethod
from typing import Dict, Any, List
from pydantic import BaseModel

class WorkflowDecision(BaseModel):
    status: str  # Approved or Rejected
    rationale: str
    metadata: Dict[str, Any]
    input_data: Dict[str, Any]

class Workflow(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        pass

    @property
    @abstractmethod
    def input_model(self) -> type[BaseModel]:
        pass

    @property
    def required_fields(self) -> List[str]:
        return list(self.input_model.model_fields.keys())

    @abstractmethod
    def evaluate_decision(self, extracted_fields: Dict[str, Any]) -> WorkflowDecision:
        pass
