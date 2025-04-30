from typing import Dict, Any, List
from ..agents.base import Environment, Role
from ..agents.roles.code_architect import CodeArchitect
import asyncio
from web3 import Web3

class FrameworkEnvironment(Environment):
    """Extended environment with blockchain integration"""
    
    def __init__(self, web3: Web3, contract_address: str):
        super().__init__()
        self.web3 = web3
        self.contract_address = contract_address
        self.registered_roles = {}
        
    def initialize_roles(self):
        """Initialize all available roles in the system"""
        # Add Code Architect role
        code_architect = CodeArchitect()
        self.add_role(code_architect)
        self.registered_roles[code_architect.name] = code_architect.wallet_address
        
    async def process_request(self, role_name: str, message: str, user_wallet: str) -> Dict[str, Any]:
        """Process a request through the appropriate role with blockchain verification"""
        if role_name not in self.roles:
            raise ValueError(f"Role {role_name} not found")
            
        # Verify user has permission to interact with the role
        if not await self._verify_permission(user_wallet, role_name):
            raise PermissionError("User does not have permission to interact with this role")
            
        # Process the request
        result = await self.run(role_name, message)
        
        # Record the interaction on blockchain
        await self._record_interaction(user_wallet, role_name, message)
        
        return result
    
    async def _verify_permission(self, user_wallet: str, role_name: str) -> bool:
        """Verify if user has permission to interact with the role"""
        # Implement blockchain-based permission verification
        # This is a placeholder - implement actual contract calls
        return True
    
    async def _record_interaction(self, user_wallet: str, role_name: str, message: str):
        """Record the interaction on the blockchain"""
        # Implement blockchain transaction recording
        # This is a placeholder - implement actual contract calls
        pass
    
    def get_available_roles(self) -> List[Dict[str, str]]:
        """Get list of available roles and their descriptions"""
        return [
            {
                "name": role.name,
                "profile": role.profile,
                "goal": role.goal,
                "wallet": role.wallet_address
            }
            for role in self.roles.values()
        ] 