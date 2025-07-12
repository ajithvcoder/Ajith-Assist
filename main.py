# main.py - FastAPI Agentic AI Server
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import asyncio
import logging
from datetime import datetime
import google.generativeai as genai
from enum import Enum
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini API
genai.configure(api_key="AIzaSyAROe4OrpLk0tfHvp2aZRk8mm3wQNtoomA")

app = FastAPI(title="Agentic AI Assistant", version="1.0.0")

# Enable CORS for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TaskType(str, Enum):
    ANALYZE = "analyze"
    RESEARCH = "research"
    WRITE = "write"
    CODE = "code"
    SUMMARIZE = "summarize"
    REPLY = "reply"
    PLAN = "plan"

class AgentRequest(BaseModel):
    text: str
    task_type: TaskType
    context: Optional[Dict[str, Any]] = {}
    user_preferences: Optional[Dict[str, Any]] = {}

class AgentStep(BaseModel):
    step_number: int
    action: str
    description: str
    status: str = "pending"
    result: Optional[str] = None
    reasoning: Optional[str] = None
    confidence: Optional[float] = None

class AgentResponse(BaseModel):
    success: bool
    result: str
    steps: List[AgentStep]
    metadata: Dict[str, Any]
    execution_time: float
    reasoning_chain: List[str]

class AgenticAI:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.conversation_history = []
        self.reasoning_chain = []
        
    async def execute_task(self, request: AgentRequest) -> AgentResponse:
        start_time = datetime.now()
        
        try:
            # Step 1: Analyze the input and understand the task
            analysis = await self._analyze_input(request)
            
            # Step 2: Create a dynamic execution plan
            plan = await self._create_execution_plan(analysis, request)
            
            # Step 3: Execute the plan with adaptive reasoning
            result = await self._execute_plan(plan, request)
            
            # Step 4: Self-evaluate and refine if needed
            final_result = await self._self_evaluate_and_refine(result, request)
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            return AgentResponse(
                success=True,
                result=final_result,
                steps=plan,
                metadata={
                    "task_type": request.task_type,
                    "input_length": len(request.text),
                    "steps_executed": len(plan),
                    "analysis": analysis
                },
                execution_time=execution_time,
                reasoning_chain=self.reasoning_chain
            )
            
        except Exception as e:
            logger.error(f"Task execution failed: {str(e)}")
            return AgentResponse(
                success=False,
                result=f"Task execution failed: {str(e)}",
                steps=[],
                metadata={},
                execution_time=0.0,
                reasoning_chain=[]
            )
    
    async def _analyze_input(self, request: AgentRequest) -> Dict[str, Any]:
        """Analyze the input text and determine the best approach"""
        analysis_prompt = f"""
        You are an AI agent analyzing user input. Provide a comprehensive analysis.
        
        Task Type: {request.task_type}
        Input Text: "{request.text}"
        Context: {request.context}
        
        Analyze and respond with JSON containing:
        {{
            "content_type": "email|code|article|question|document|other",
            "complexity": "simple|medium|complex",
            "domain": "technical|business|creative|academic|personal",
            "key_entities": ["entity1", "entity2"],
            "intent": "clear description of what user wants",
            "required_capabilities": ["capability1", "capability2"],
            "success_criteria": "what makes this task successful",
            "potential_challenges": ["challenge1", "challenge2"],
            "estimated_steps": 3
        }}
        """
        
        response = await self._call_gemini(analysis_prompt)
        self.reasoning_chain.append(f"Analysis: {response}")
        
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {
                "content_type": "unknown",
                "complexity": "medium",
                "domain": "general",
                "key_entities": [],
                "intent": "process the input",
                "required_capabilities": ["analysis"],
                "success_criteria": "provide helpful response",
                "potential_challenges": [],
                "estimated_steps": 2
            }
    
    async def _create_execution_plan(self, analysis: Dict[str, Any], request: AgentRequest) -> List[AgentStep]:
        """Create a dynamic execution plan based on analysis"""
        planning_prompt = f"""
        You are an AI agent creating an execution plan. Based on the analysis below, create a step-by-step plan.
        
        Analysis: {json.dumps(analysis, indent=2)}
        Task Type: {request.task_type}

        Original Request: "{request.text}"
        
        Create a JSON array of steps, each with:
        {{
            "step_number": number,
            "action": "specific action to take",
            "description": "detailed description",
            "reasoning": "why this step is needed",
            "expected_output": "what this step should produce"
        }}
        
        Make the plan adaptive and intelligent. Consider:
        - Breaking complex tasks into manageable steps
        - Including validation and quality checks
        - Adding refinement steps for complex outputs
        - Considering user context and preferences
        """
        
        response = await self._call_gemini(planning_prompt)
        self.reasoning_chain.append(f"Planning: {response}")
        
        try:
            steps_data = json.loads(response)
            return [AgentStep(**step) for step in steps_data]
        except (json.JSONDecodeError, TypeError):
            # Fallback plan
            return [
                AgentStep(
                    step_number=1,
                    action="process",
                    description="Process the input according to task requirements",
                    reasoning="Direct processing needed"
                )
            ]
    
    async def _execute_plan(self, plan: List[AgentStep], request: AgentRequest) -> str:
        """Execute the plan step by step with adaptive reasoning"""
        context = {"original_request": request.text, "task_type": request.task_type}
        
        for step in plan:
            step.status = "executing"
            
            # Build context-aware prompt for this step
            step_prompt = await self._build_step_prompt(step, context, request)
            
            # Execute the step
            step_result = await self._call_gemini(step_prompt)
            
            # Evaluate step quality
            confidence = await self._evaluate_step_quality(step_result, step)
            
            step.result = step_result
            step.confidence = confidence
            step.status = "completed"
            
            # Update context for next steps
            context[f"step_{step.step_number}_result"] = step_result
            
            self.reasoning_chain.append(f"Step {step.step_number}: {step.description} -> {step_result[:100]}...")
            
            # If confidence is low, try to improve
            if confidence < 0.7:
                improved_result = await self._improve_step_result(step_result, step, context)
                if improved_result:
                    step.result = improved_result
                    step.confidence = await self._evaluate_step_quality(improved_result, step)
        
        # Combine all step results into final output
        final_result = await self._synthesize_final_result(plan, request)
        return final_result
    
    async def _build_step_prompt(self, step: AgentStep, context: Dict[str, Any], request: AgentRequest) -> str:
        """Build a context-aware prompt for executing a specific step"""
        context_str = "\n".join([f"{k}: {v}" for k, v in context.items()])
        
        return f"""
        You are executing step {step.step_number} of an agentic AI task.
        
        Step Details:
        - Action: {step.action}
        - Description: {step.description}
        - Reasoning: {step.reasoning}
        
        Context from previous steps:
        {context_str}
        
        Task Type: {request.task_type}
        User Preferences: {request.user_preferences}
        
        Execute this step thoughtfully and provide high-quality output.
        Focus on being accurate, helpful, and aligned with the user's intent.
        """
    
    async def _evaluate_step_quality(self, result: str, step: AgentStep) -> float:
        """Evaluate the quality of a step result"""
        evaluation_prompt = f"""
        Evaluate the quality of this step result on a scale of 0.0 to 1.0:
        
        Step: {step.description}
        Result: {result}
        
        Consider:
        - Accuracy and correctness
        - Completeness
        - Relevance to the step goal
        - Clarity and usefulness
        
        Respond with only a number between 0.0 and 1.0.
        """
        
        try:
            response = await self._call_gemini(evaluation_prompt)
            # Extract number from response
            import re
            match = re.search(r'(\d+\.?\d*)', response)
            return float(match.group(1)) if match else 0.5
        except:
            return 0.5
    
    async def _improve_step_result(self, result: str, step: AgentStep, context: Dict[str, Any]) -> Optional[str]:
        """Attempt to improve a low-quality step result"""
        improvement_prompt = f"""
        The following step result needs improvement:
        
        Step: {step.description}
        Current Result: {result}
        Context: {context}
        
        Improve this result by making it more accurate, complete, and helpful.
        If the result is already good, return it unchanged.
        """
        
        try:
            improved = await self._call_gemini(improvement_prompt)
            return improved if len(improved) > len(result) * 0.8 else None
        except:
            return None
    
    async def _synthesize_final_result(self, plan: List[AgentStep], request: AgentRequest) -> str:
        """Synthesize all step results into a coherent final output"""
        step_results = "\n\n".join([
            f"Step {step.step_number}: {step.result}"
            for step in plan if step.result
        ])
        
        synthesis_prompt = f"""
        Synthesize the following step results into a final, coherent response:
        
        Original Request: "{request.text}"
        Task Type: {request.task_type}
        
        Step Results:
        {step_results}
        
        Create a well-structured, comprehensive final response that:
        - Directly addresses the user's request
        - Incorporates insights from all steps
        - Is clear and actionable
        - Maintains appropriate tone and style
        """
        
        final_result = await self._call_gemini(synthesis_prompt)
        self.reasoning_chain.append(f"Final synthesis: {final_result[:100]}...")
        
        return final_result
    
    async def _self_evaluate_and_refine(self, result: str, request: AgentRequest) -> str:
        """Self-evaluate the result and refine if needed"""
        evaluation_prompt = f"""
        Evaluate this result and suggest improvements:
        
        Original Request: "{request.text}"
        Task Type: {request.task_type}
        Current Result: {result}
        
        Is this result:
        1. Complete and accurate?
        2. Well-structured and clear?
        3. Directly addressing the user's needs?
        4. Appropriate in tone and style?
        
        If improvements are needed, provide the improved version.
        If the result is already excellent, return "APPROVED: " followed by the original result.
        """
        
        evaluation = await self._call_gemini(evaluation_prompt)
        
        if evaluation.startswith("APPROVED:"):
            return evaluation.replace("APPROVED: ", "")
        else:
            self.reasoning_chain.append(f"Result refined based on self-evaluation")
            return evaluation
    
    async def _call_gemini(self, prompt: str) -> str:
        """Call the Gemini API with error handling"""
        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API call failed: {str(e)}")
            return f"Error: {str(e)}"

# Global agent instance
agent = AgenticAI()

@app.post("/agent/execute", response_model=AgentResponse)
async def execute_agent_task(request: AgentRequest):
    """Execute an agentic AI task"""
    try:
        response = await agent.execute_task(request)
        print(response)
        return response
    except Exception as e:
        print(f"Agent execution failed: {str(e)}")
        logger.error(f"Agent execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agent/chat")
async def chat_with_agent(request: dict):
    """Simple chat interface with the agent"""
    try:
        agent_request = AgentRequest(
            text=request.get("message", ""),
            task_type=TaskType.ANALYZE,
            context=request.get("context", {}),
            user_preferences=request.get("preferences", {})
        )
        
        response = await agent.execute_task(agent_request)
        print(response)
        return {
            "response": response.result,
            "reasoning": response.reasoning_chain[-1] if response.reasoning_chain else "",
            "confidence": sum(step.confidence or 0.5 for step in response.steps) / len(response.steps) if response.steps else 0.5
        }
    except Exception as e:
        print(f"Chat failed: {str(e)}")
        logger.error(f"Chat failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agent/status")
async def get_agent_status():
    """Get agent status and capabilities"""
    return {
        "status": "active",
        "capabilities": [
            "text analysis",
            "research assistance",
            "content generation",
            "code explanation",
            "email drafting",
            "summarization",
            "task planning"
        ],
        "supported_formats": ["text", "code", "email", "documents"],
        "reasoning_enabled": True,
        "self_evaluation": True
    }

@app.get("/")
async def root():
    return {"message": "Agentic AI Assistant is running!", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
