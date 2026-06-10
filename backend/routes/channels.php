<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Private channel: only admins/lgu_staff can subscribe to operational channels
Broadcast::channel('hazards', function (User $user) {
    return in_array($user->role, ['admin', 'lgu_staff']);
});

Broadcast::channel('shelters', function (User $user) {
    return in_array($user->role, ['admin', 'lgu_staff']);
});

// Public channel: residents subscribe to map updates
Broadcast::channel('map-updates', function () {
    return true;
});
