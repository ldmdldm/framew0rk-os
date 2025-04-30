from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod
import json
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

class Role(ABC):
    """Base class for all roles in the system"""
    def __init__(self, name: str, profile: str, goal: str, wallet_address: Optional[str] = None):
        self.name = name
        self.profile = profile
        self.goal = goal
        self.wallet_address = wallet_address
        self.llm = ChatOpenAI(temperature=0.7)
        self.memory = []
        self.actions = []
        
    @abstractmethod
    async def run(self, message: str) -> Dict[str, Any]:
        """Main execution method for the role"""
        pass
    
    def add_action(self, action: 'Action'):
        """Add an action to the role's action list"""
        self.actions.append(action)
        
    def get_memory(self) -> List[Dict[str, str]]:
        """Return role's conversation memory"""
        return self.memory

class Action:
    """Base class for actions that roles can perform"""
    def __init__(self, name: str, context: Dict[str, Any]):
        self.name = name
        self.context = context
        
    async def run(self, role: Role, message: str) -> Dict[str, Any]:
        """Execute the action"""
        pass

class Environment:
    """Manages the interaction between roles and actions"""
    def __init__(self):
        self.roles = {}
        self.messages = []
        
    def add_role(self, role: Role):
        """Add a role to the environment"""
        self.roles[role.name] = role
        
    async def run(self, role_name: str, message: str) -> Dict[str, Any]:
        """Execute a role's actions in the environment"""
        if role_name not in self.roles:
            raise ValueError(f"Role {role_name} not found")
            
        role = self.roles[role_name]
        result = await role.run(message)
        self.messages.append({
            "role": role_name,
            "message": message,
            "result": result
        })
        return result 