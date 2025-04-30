from typing import Dict, Any
from ..base import Role, Action

class CodeArchitect(Role):
    """Role responsible for designing and architecting code solutions"""
    
    def __init__(self, wallet_address: str = None):
        super().__init__(
            name="CodeArchitect",
            profile="Expert in software architecture and design patterns",
            goal="Design robust and scalable software architectures",
            wallet_address=wallet_address
        )
        self.add_action(DesignArchitectureAction())
        self.add_action(ReviewCodeAction())
        
    async def run(self, message: str) -> Dict[str, Any]:
        """Process architecture-related requests"""
        self.memory.append({"role": "user", "content": message})
        
        # Determine which action to take based on the message
        action = self._select_action(message)
        result = await action.run(self, message)
        
        self.memory.append({"role": "assistant", "content": result["response"]})
        return result
    
    def _select_action(self, message: str) -> Action:
        """Select the appropriate action based on the message"""
        if "design" in message.lower() or "architecture" in message.lower():
            return self.actions[0]
        return self.actions[1]

class DesignArchitectureAction(Action):
    """Action for designing software architecture"""
    
    def __init__(self):
        super().__init__(
            name="DesignArchitecture",
            context={"purpose": "Design software architecture based on requirements"}
        )
        
    async def run(self, role: Role, message: str) -> Dict[str, Any]:
        response = await role.llm.agenerate([
            SystemMessage(content=f"You are a Code Architect. Design a robust architecture for: {message}"),
            HumanMessage(content=message)
        ])
        
        return {
            "action": self.name,
            "response": response.generations[0][0].text,
            "wallet": role.wallet_address
        }

class ReviewCodeAction(Action):
    """Action for reviewing code and providing architectural feedback"""
    
    def __init__(self):
        super().__init__(
            name="ReviewCode",
            context={"purpose": "Review code and provide architectural feedback"}
        )
        
    async def run(self, role: Role, message: str) -> Dict[str, Any]:
        response = await role.llm.agenerate([
            SystemMessage(content="You are a Code Architect. Review the following code and provide architectural feedback:"),
            HumanMessage(content=message)
        ])
        
        return {
            "action": self.name,
            "response": response.generations[0][0].text,
            "wallet": role.wallet_address
        } 