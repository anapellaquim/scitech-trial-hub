-- Create table for project templates
CREATE TABLE public.project_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text DEFAULT 'clinical_trial',
  phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view project_templates" 
ON public.project_templates 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage project_templates" 
ON public.project_templates 
FOR ALL 
USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_project_templates_updated_at
BEFORE UPDATE ON public.project_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert default clinical trial template
INSERT INTO public.project_templates (name, description, category, phases) VALUES
(
  'Estudo Clínico Completo',
  'Modelo completo para condução de estudos clínicos, desde o planejamento até o arquivamento',
  'clinical_trial',
  '[
    {
      "name": "1. Planejamento do Estudo",
      "description": "Fase inicial de concepção e design do estudo",
      "order": 1,
      "activities": [
        {"title": "Definição dos objetivos do estudo", "priority": "high"},
        {"title": "Design do protocolo", "priority": "high"},
        {"title": "Definição de critérios de inclusão/exclusão", "priority": "high"},
        {"title": "Cálculo amostral", "priority": "medium"},
        {"title": "Definição de desfechos primários e secundários", "priority": "high"},
        {"title": "Elaboração do cronograma", "priority": "medium"},
        {"title": "Estimativa de orçamento", "priority": "medium"},
        {"title": "Identificação de potenciais centros", "priority": "medium"},
        {"title": "Seleção de investigadores", "priority": "high"}
      ]
    },
    {
      "name": "2. Desenvolvimento Documental",
      "description": "Elaboração de documentos essenciais",
      "order": 2,
      "activities": [
        {"title": "Elaboração do protocolo final", "priority": "high"},
        {"title": "Desenvolvimento do TCLE", "priority": "high"},
        {"title": "Criação do CRF/eCRF", "priority": "high"},
        {"title": "Manual do Investigador", "priority": "medium"},
        {"title": "Procedimentos Operacionais Padrão (POPs)", "priority": "medium"},
        {"title": "Plano de monitoramento", "priority": "medium"},
        {"title": "Plano de gerenciamento de dados", "priority": "medium"},
        {"title": "Plano estatístico", "priority": "medium"}
      ]
    },
    {
      "name": "3. Submissão Regulatória",
      "description": "Aprovações éticas e regulatórias",
      "order": 3,
      "activities": [
        {"title": "Preparação do dossiê para CEP", "priority": "high"},
        {"title": "Submissão ao CEP", "priority": "high"},
        {"title": "Resposta a pendências do CEP", "priority": "high"},
        {"title": "Obtenção de aprovação do CEP", "priority": "high"},
        {"title": "Submissão à CONEP (se aplicável)", "priority": "medium"},
        {"title": "Registro na ANVISA (se aplicável)", "priority": "medium"},
        {"title": "Registro no ClinicalTrials.gov", "priority": "medium"},
        {"title": "Obtenção de todas as aprovações", "priority": "high"}
      ]
    },
    {
      "name": "4. Seleção e Qualificação de Centros",
      "description": "Avaliação e ativação dos centros de pesquisa",
      "order": 4,
      "activities": [
        {"title": "Visita de seleção de centros (SQV)", "priority": "high"},
        {"title": "Avaliação de viabilidade", "priority": "high"},
        {"title": "Negociação de contratos", "priority": "medium"},
        {"title": "Assinatura de contratos", "priority": "high"},
        {"title": "Configuração de acessos ao sistema", "priority": "medium"},
        {"title": "Envio de materiais do estudo", "priority": "medium"}
      ]
    },
    {
      "name": "5. Início do Estudo (Start-up)",
      "description": "Ativação dos centros e início do recrutamento",
      "order": 5,
      "activities": [
        {"title": "Visita de iniciação (SIV)", "priority": "high"},
        {"title": "Treinamento da equipe do centro", "priority": "high"},
        {"title": "Treinamento em GCP", "priority": "high"},
        {"title": "Configuração do site file", "priority": "medium"},
        {"title": "Liberação para recrutamento", "priority": "high"},
        {"title": "Início do recrutamento", "priority": "high"}
      ]
    },
    {
      "name": "6. Condução do Estudo",
      "description": "Execução e monitoramento do estudo",
      "order": 6,
      "activities": [
        {"title": "Recrutamento de participantes", "priority": "high"},
        {"title": "Acompanhamento de participantes", "priority": "high"},
        {"title": "Visitas de monitoramento (IMV)", "priority": "high"},
        {"title": "Resolução de queries", "priority": "medium"},
        {"title": "Gerenciamento de eventos adversos", "priority": "high"},
        {"title": "Relatórios de segurança", "priority": "high"},
        {"title": "Reuniões de acompanhamento", "priority": "medium"},
        {"title": "Emendas ao protocolo (se necessário)", "priority": "medium"}
      ]
    },
    {
      "name": "7. Encerramento do Estudo",
      "description": "Fechamento do recrutamento e visitas finais",
      "order": 7,
      "activities": [
        {"title": "Encerramento do recrutamento", "priority": "high"},
        {"title": "Última visita do último participante (LPLV)", "priority": "high"},
        {"title": "Visita de encerramento (COV)", "priority": "high"},
        {"title": "Reconciliação de materiais", "priority": "medium"},
        {"title": "Fechamento de queries pendentes", "priority": "high"},
        {"title": "Lock do banco de dados", "priority": "high"}
      ]
    },
    {
      "name": "8. Análise e Relatório",
      "description": "Análise de dados e elaboração de relatórios",
      "order": 8,
      "activities": [
        {"title": "Análise estatística", "priority": "high"},
        {"title": "Elaboração do relatório final", "priority": "high"},
        {"title": "Revisão do relatório final", "priority": "high"},
        {"title": "Submissão do relatório ao CEP", "priority": "high"},
        {"title": "Publicação dos resultados", "priority": "medium"},
        {"title": "Comunicação aos participantes", "priority": "medium"}
      ]
    },
    {
      "name": "9. Arquivamento",
      "description": "Organização e arquivamento dos documentos",
      "order": 9,
      "activities": [
        {"title": "Organização do TMF (Trial Master File)", "priority": "high"},
        {"title": "Arquivamento de documentos essenciais", "priority": "high"},
        {"title": "Backup de dados eletrônicos", "priority": "high"},
        {"title": "Transferência de documentos para arquivo", "priority": "medium"},
        {"title": "Certificação de arquivamento", "priority": "medium"}
      ]
    }
  ]'::jsonb
),
(
  'Estudo Observacional',
  'Modelo para estudos observacionais e de coorte',
  'observational',
  '[
    {
      "name": "1. Planejamento",
      "description": "Definição do estudo observacional",
      "order": 1,
      "activities": [
        {"title": "Definição da pergunta de pesquisa", "priority": "high"},
        {"title": "Design do estudo", "priority": "high"},
        {"title": "Definição da população de estudo", "priority": "high"},
        {"title": "Definição de variáveis a coletar", "priority": "medium"},
        {"title": "Elaboração do protocolo", "priority": "high"}
      ]
    },
    {
      "name": "2. Aprovações",
      "description": "Submissões regulatórias",
      "order": 2,
      "activities": [
        {"title": "Elaboração do TCLE", "priority": "high"},
        {"title": "Submissão ao CEP", "priority": "high"},
        {"title": "Obtenção de aprovação", "priority": "high"}
      ]
    },
    {
      "name": "3. Coleta de Dados",
      "description": "Execução do estudo",
      "order": 3,
      "activities": [
        {"title": "Recrutamento", "priority": "high"},
        {"title": "Coleta de dados", "priority": "high"},
        {"title": "Acompanhamento", "priority": "medium"},
        {"title": "Controle de qualidade dos dados", "priority": "medium"}
      ]
    },
    {
      "name": "4. Análise e Publicação",
      "description": "Finalização do estudo",
      "order": 4,
      "activities": [
        {"title": "Análise estatística", "priority": "high"},
        {"title": "Elaboração do manuscrito", "priority": "high"},
        {"title": "Submissão para publicação", "priority": "medium"},
        {"title": "Arquivamento", "priority": "medium"}
      ]
    }
  ]'::jsonb
),
(
  'Estudo Fase I',
  'Modelo para estudos de Fase I - Segurança e farmacocinética',
  'phase_1',
  '[
    {
      "name": "1. Preparação",
      "description": "Preparação do estudo de Fase I",
      "order": 1,
      "activities": [
        {"title": "Revisão de dados pré-clínicos", "priority": "high"},
        {"title": "Definição de dose inicial", "priority": "high"},
        {"title": "Design do estudo de escalonamento", "priority": "high"},
        {"title": "Seleção de centro especializado", "priority": "high"},
        {"title": "Elaboração do protocolo", "priority": "high"}
      ]
    },
    {
      "name": "2. Regulatório",
      "description": "Aprovações para Fase I",
      "order": 2,
      "activities": [
        {"title": "Dossiê do Investigador (IB)", "priority": "high"},
        {"title": "Submissão à ANVISA", "priority": "high"},
        {"title": "Submissão ao CEP/CONEP", "priority": "high"},
        {"title": "Obtenção de aprovações", "priority": "high"}
      ]
    },
    {
      "name": "3. Condução",
      "description": "Execução do estudo",
      "order": 3,
      "activities": [
        {"title": "Recrutamento de voluntários sadios", "priority": "high"},
        {"title": "Administração de doses", "priority": "high"},
        {"title": "Coleta de amostras PK", "priority": "high"},
        {"title": "Monitoramento de segurança intensivo", "priority": "high"},
        {"title": "Análise de DLT", "priority": "high"},
        {"title": "Reuniões de escalonamento de dose", "priority": "high"}
      ]
    },
    {
      "name": "4. Finalização",
      "description": "Encerramento e análise",
      "order": 4,
      "activities": [
        {"title": "Análise farmacocinética", "priority": "high"},
        {"title": "Determinação de MTD/RP2D", "priority": "high"},
        {"title": "Relatório de estudo clínico", "priority": "high"},
        {"title": "Arquivamento", "priority": "medium"}
      ]
    }
  ]'::jsonb
);