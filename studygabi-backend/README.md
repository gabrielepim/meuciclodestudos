# StudyGabi — Backend Python

Backend FastAPI que substitui o Supabase. Usa SQLite como banco de dados local.

## Instalação

```bash
pip install -r requirements.txt
```

## Rodar

```bash
uvicorn main:app --reload --port 8000
```

O banco `studygabi.db` é criado automaticamente na primeira execução.

## Documentação

Acesse: http://localhost:8000/docs

## Variáveis de Ambiente (opcional)

```
SECRET_KEY=sua-chave-secreta-aqui
```

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /auth/register | Cadastrar conta |
| POST | /auth/login | Login |
| GET | /auth/me | Dados do usuário |
| GET/POST | /productivity-records | Sessões de estudo |
| GET/POST/DELETE | /error-entries | Caderno de erros |
| GET/POST/PATCH/DELETE | /editorial-topics | Edital |
| GET/POST/PATCH/DELETE | /arguments | Argumentos |
| GET/POST | /exam-questions | Banco de questões |
| PATCH | /exam-questions/{id}/answer | Responder questão |
| GET/POST/DELETE | /brain-dumps | Brain dump |
| GET/POST | /smart-review | Revisão inteligente |
| PATCH | /smart-review/{id}/reviewed | Marcar revisado |
| GET/POST | /discursiva-themes | Temas de discursiva |
| GET/POST | /discursiva-essays | Redações |
| GET | /dashboard/kpis | KPIs do dashboard |
| GET | /export/all | Exportar todos os dados |
