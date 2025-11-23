import { Campaign, AIInstructions } from '@/types/dispatch';

export const validateCampaign = (campaign: Partial<Campaign>) => {
  const errors: string[] = [];
  
  if (!campaign.name?.trim()) {
    errors.push('Nome da campanha é obrigatório');
  }
  
  if (!campaign.objective?.trim()) {
    errors.push('Objetivo é obrigatório');
  }
  
  if (campaign.ai_instructions) {
    const ai = campaign.ai_instructions;
    
    if (!ai.identidade?.trim()) {
      errors.push('Identidade da IA é obrigatória');
    }
    
    if (!ai.objetivo?.trim()) {
      errors.push('Objetivo da IA é obrigatório');
    }
    
    if (!ai.tom_estilo?.trim()) {
      errors.push('Tom e estilo da IA é obrigatório');
    }
    
    if (!ai.cta?.trim()) {
      errors.push('CTA (Call to Action) é obrigatório');
    }
    
    if (!ai.restricoes?.trim()) {
      errors.push('Restrições da IA são obrigatórias');
    }
  } else {
    errors.push('Instruções para IA são obrigatórias');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateAIInstructions = (ai: Partial<AIInstructions>) => {
  const errors: string[] = [];
  
  if (!ai.identidade?.trim()) {
    errors.push('Identidade é obrigatória');
  }
  
  if (!ai.objetivo?.trim()) {
    errors.push('Objetivo é obrigatório');
  }
  
  if (!ai.tom_estilo?.trim()) {
    errors.push('Tom e estilo é obrigatório');
  }
  
  if (!ai.cta?.trim()) {
    errors.push('CTA é obrigatório');
  }
  
  if (!ai.restricoes?.trim()) {
    errors.push('Restrições são obrigatórias');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
