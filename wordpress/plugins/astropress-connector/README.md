# AstroPress Connector (WordPress Plugin)

O **AstroPress Connector** é o plugin WordPress oficial para integrar o seu WordPress CMS desacoplado com o frontend estático construído em **Astro**.

---

## 🚀 Funcionalidades

1. **Redirecionamento Automático de Frontend:**
   - Redireciona todas as visitas públicas do WordPress diretamente para a rota equivalente no Astro (ex: `/blog/meu-post/`, `/sobre/`).
   - Protege rotas administrativas (`/wp-admin`, `/wp-login.php`, `/wp-json/*`, `/wp-cron.php`, `/wp-content/uploads/*`).

2. **Reescrita de Links no Painel:**
   - Botões *"Ver Post"*, *"Ver Página"* e *"Visitar Site"* no painel do WordPress abrem automaticamente o seu site no Astro (`http://localhost:4321` ou domínio de produção).

3. **Webhooks de Deploy Automático & Manual:**
   - Dispara builds automáticos na Vercel, Netlify ou GitHub Actions sempre que um post/página for publicado, atualizado ou excluído.
   - Proteção de **Debounce** (padrão de 30s) para evitar sobrecarga de builds acidentais.
   - Botão **"🚀 Rebuild Site"** na barra superior do WordPress Admin para rebuild manual sob demanda.

4. **Endpoint de Diagnóstico REST:**
   - Rota `GET /wp-json/astropress/v1/health` para verificação automática de saúde, permalinks e plugins de SEO ativos.

---

## 📦 Instalação

1. Copie a pasta `wordpress/plugins/astropress-connector` para o diretório `wp-content/plugins/` da sua instalação WordPress.
2. Acesse **Painel do WordPress > Plugins > Plugins Instalados**.
3. Ative o **AstroPress Connector**.
4. Vá em **Configurações > AstroPress** e insira a URL do seu frontend Astro (ex: `http://localhost:4321` ou `https://meusite.com`).

---

## ⚙️ Configuração via `wp-config.php` (Opcional)

Você pode fixar as configurações diretamente no arquivo `wp-config.php` do WordPress:

```php
// URL do frontend Astro
define('ASTROPRESS_FRONTEND_URL', 'http://localhost:4321');

// Webhook de deploy (Vercel / Netlify / GitHub Actions)
define('ASTROPRESS_DEPLOY_HOOK_URL', 'https://api.vercel.com/v1/integrations/deploy/...');

// Ativar/Desativar redirecionamento de visitantes
define('ASTROPRESS_ENABLE_REDIRECT', true);

// Tempo de debounce em segundos entre deploys automáticos
define('ASTROPRESS_DEPLOY_DEBOUNCE', 30);
```
