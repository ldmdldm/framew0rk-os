from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from ..environment.manager import FrameworkEnvironment
from web3 import Web3
import os

app = FastAPI()

# Initialize Web3 and environment
web3 = Web3(Web3.HTTPProvider(os.getenv("WEB3_PROVIDER_URL")))
env = FrameworkEnvironment(web3, os.getenv("CONTRACT_ADDRESS"))
env.initialize_roles()

class AgentRequest(BaseModel):
    role: str
    message: str
    wallet_address: str

class AgentResponse(BaseModel):
    role: str
    response: str
    wallet: str
    action: str

@app.get("/roles")
async def get_roles() -> List[Dict[str, str]]:
    """Get list of available roles"""
    return env.get_available_roles()

@app.post("/interact", response_model=AgentResponse)
async def interact_with_agent(request: AgentRequest) -> Dict[str, Any]:
    """Interact with a specific role"""
    try:
        result = await env.process_request(
            request.role,
            request.message,
            request.wallet_address
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/role/{role_name}/memory")
async def get_role_memory(role_name: str) -> List[Dict[str, str]]:
    """Get conversation memory for a specific role"""
    if role_name not in env.roles:
        raise HTTPException(status_code=404, detail=f"Role {role_name} not found")
    return env.roles[role_name].get_memory() 