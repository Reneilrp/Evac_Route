# Evac_Route Backend API

This is the Laravel 11 backend service providing RESTful APIs, database migrations, real-time WebSocket broadcasting (Laravel Reverb), and offline graph dataset endpoints.

## ⚙️ Environment Setup & Configuration

1. **Copy Environment Template:**
   ```bash
   cp .env.example .env
   ```
2. **Generate Application Key:**
   ```bash
   php artisan key:generate
   ```
3. **Configure Environment Variables in `.env`:**
   - **Database:** Configure `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.
   - **Mapbox Public Token:** Get your default public token (`pk.***`) at [https://account.mapbox.com/](https://account.mapbox.com/) and set `MAPBOX_TOKEN=pk.YOUR_MAPBOX_PUBLIC_TOKEN_HERE` for route elevation & terrain processing.
   - **Laravel Reverb (WebSockets):** Set `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`, `REVERB_HOST`, and `REVERB_PORT`.
   - **OpenWeather API:** Set `OPENWEATHER_API_KEY` for live weather monitoring.

4. **Run Migrations & Seed Data:**
   ```bash
   php artisan migrate --seed
   ```

5. **Start HTTP Server:**
   ```bash
   php artisan serve --host 0.0.0.0 --port 8000
   ```

6. **Start Reverb WebSockets:**
   ```bash
   php artisan reverb:start
   ```

---

## About Laravel


Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
