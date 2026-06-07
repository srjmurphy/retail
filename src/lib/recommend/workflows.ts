export type RecommendationWorkflowId = "happy_path" | "distributed_stock" | "unmet_demand";

export type RecommendationWorkflow = {
  id: RecommendationWorkflowId;
  sequence: number;
  label: string;
  title: string;
  description: string;
  expectedOutcome: string;
  query: string;
  candidateIds: string[];
};

export const RECOMMENDATION_WORKFLOWS: RecommendationWorkflow[] = [
  {
    id: "happy_path",
    sequence: 1,
    label: "Happy Path",
    title: "Perfect outfit, one store",
    description: "A complete pictured outfit with the right size, budget, stock and in-store routes.",
    expectedOutcome: "4 matching pieces available at Oak Street",
    query:
      "I need a navy wedding outfit with a formal shirt, trousers, shoes and tie, men's size 42, under $400.",
    candidateIds: ["27152", "18197", "45595", "49696"],
  },
  {
    id: "distributed_stock",
    sequence: 2,
    label: "Semi-Failure",
    title: "Stock split across stores",
    description: "The outfit is achievable, but an associate must combine local stock with a nearby-store option.",
    expectedOutcome: "Local workwear plus a nearby pink dress",
    query: "I need a pink interview outfit with a dress and tailored trousers, women's size 10, under $250.",
    candidateIds: ["46216", "57139", "27917"],
  },
  {
    id: "unmet_demand",
    sequence: 3,
    label: "Failure Path",
    title: "Nothing available",
    description: "Relevant products exist, but the requested plus-size stock is unavailable across all three stores.",
    expectedOutcome: "0 items available in size 18",
    query: "I need plus-size formalwear for a winter wedding, women's size 18, under $250.",
    candidateIds: ["48481", "59982", "57993", "59973"],
  },
];

export function getRecommendationWorkflow(workflowId?: RecommendationWorkflowId | null) {
  return RECOMMENDATION_WORKFLOWS.find((workflow) => workflow.id === workflowId) ?? null;
}
