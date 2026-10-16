<?php

namespace App\Http\Controllers\Api;

use App\Events\RescueMissionDispatched;
use App\Events\RescueMissionStatusUpdated;
use App\Events\RescueSOSAlert;
use App\Events\ShelterStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\EvacuationLog;
use App\Models\FamilyProfile;
use App\Models\PendingIncident;
use App\Models\RescueMission;
use App\Models\RescueUnit;
use App\Models\Shelter;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RescueMissionController extends Controller
{
    /**
     * List all rescue units and their operational availability.
     */
    public function units(Request $request)
    {
        $units = RescueUnit::with([
            'assignedPersonnel:id,name,email',
            'crewMembers:id,name,email,rescue_role,status,assigned_rescue_unit_id',
            'activeMission.targetShelter:id,name,latitude,longitude',
        ])
            ->orderByRaw("CASE status WHEN 'standby' THEN 1 WHEN 'on_scene' THEN 2 WHEN 'en_route' THEN 3 WHEN 'transporting' THEN 4 ELSE 5 END")
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $units,
        ]);
    }

    /**
     * List missions (active or historical).
     */
    public function missions(Request $request)
    {
        $query = RescueMission::with([
            'rescueUnit:id,name,call_sign,unit_type,status,contact_number,current_latitude,current_longitude',
            'targetShelter:id,name,barangay,current_occupancy,max_capacity,latitude,longitude',
            'stagingPoint:id,name,facility_type,barangay,current_occupancy,max_capacity,latitude,longitude',
            'dispatcher:id,name',
            'incident:id,name,hazard_type,severity_level,photo_path',
        ]);

        if ($request->has('status')) {
            $statuses = explode(',', $request->query('status'));
            $query->whereIn('status', $statuses);
        }

        if ($request->has('unit_id')) {
            $query->where('rescue_unit_id', $request->query('unit_id'));
        }

        if ($request->has('active_only') && $request->boolean('active_only')) {
            $query->whereIn('status', ['dispatched', 'en_route', 'on_scene', 'transporting', 'staged_at_assembly']);
        }

        $missions = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $missions,
        ]);
    }

    /**
     * Dispatch a rescue unit to an incident / victim.
     * Accessible by CDRRMO Admin and Dispatchers.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'rescue_unit_id' => 'required|exists:rescue_units,id',
            'victim_name' => 'required|string|max:255',
            'victim_phone' => 'nullable|string|max:50',
            'victim_latitude' => 'required|numeric|between:-90,90',
            'victim_longitude' => 'required|numeric|between:-180,180',
            'barangay' => 'nullable|string|max:100',
            'headcount' => 'required|integer|min:1|max:50',
            'special_needs' => 'nullable|string|max:255',
            'situation_description' => 'nullable|string|max:1000',
            'triage_level' => 'nullable|in:critical,urgent,standard',
            'pending_incident_id' => 'nullable|exists:pending_incidents,id',
            'target_shelter_id' => 'nullable|exists:shelters,id',
            'staging_point_id' => 'nullable|exists:shelters,id',
            'status' => 'nullable|in:dispatched,en_route',
            'equipments' => 'nullable|array',
            'equipments.*' => 'string|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        $unit = RescueUnit::findOrFail($validated['rescue_unit_id']);

        if (in_array($unit->status, ['en_route', 'on_scene', 'transporting'])) {
            return response()->json([
                'status' => 'error',
                'message' => "Rescue unit {$unit->name} is currently engaged in an active mission.",
            ], 422);
        }

        $initialStatus = $validated['status'] ?? 'dispatched';

        $notes = $validated['notes'] ?? '';
        if (!empty($validated['equipments'])) {
            $equipStr = '[EQUIPMENT DEPLOYED]: ' . implode(', ', $validated['equipments']);
            $notes = !empty($notes) ? "{$notes} | {$equipStr}" : $equipStr;
        }

        $mission = DB::transaction(function () use ($validated, $unit, $request, $initialStatus, $notes) {
            $year = date('Y');
            $count = RescueMission::whereYear('created_at', $year)->count() + 1;
            $controlNo = 'RES-'.$year.'-'.str_pad($count, 4, '0', STR_PAD_LEFT);

            $mission = RescueMission::create([
                'control_no' => $controlNo,
                'pending_incident_id' => $validated['pending_incident_id'] ?? null,
                'rescue_unit_id' => $unit->id,
                'dispatched_by' => $request->user()->id,
                'status' => $initialStatus,
                'triage_level' => $validated['triage_level'] ?? 'urgent',
                'victim_name' => $validated['victim_name'],
                'victim_phone' => $validated['victim_phone'] ?? null,
                'victim_latitude' => $validated['victim_latitude'],
                'victim_longitude' => $validated['victim_longitude'],
                'barangay' => $validated['barangay'] ?? null,
                'headcount' => $validated['headcount'],
                'special_needs' => $validated['special_needs'] ?? null,
                'situation_description' => $validated['situation_description'] ?? null,
                'target_shelter_id' => $validated['target_shelter_id'] ?? null,
                'staging_point_id' => $validated['staging_point_id'] ?? null,
                'dispatched_at' => now(),
                'notes' => !empty($notes) ? $notes : null,
            ]);

            $unit->update(['status' => $initialStatus]);

            return $mission->load(['rescueUnit', 'targetShelter', 'stagingPoint']);
        });

        // Broadcast real-time dispatch notification
        event(new RescueMissionDispatched($mission));

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'rescue_mission_dispatched',
            'ip_address' => $request->ip(),
            'old_values' => null,
            'new_values' => [
                'mission_id' => $mission->id,
                'control_no' => $mission->control_no,
                'unit_id' => $unit->id,
                'unit_name' => $unit->name,
                'triage_level' => $mission->triage_level,
                'headcount' => $mission->headcount,
            ],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Rescue unit {$unit->name} successfully dispatched.",
            'data' => $mission,
        ], 201);
    }

    /**
     * Direct 911 Hotline / VHF Radio Call-In Emergency Intake.
     * Allows dispatchers to rapidly create and dispatch missions for offline callers.
     * Route: POST /api/rescue/hotline-intake
     */
    public function hotlineIntake(Request $request)
    {
        $validated = $request->validate([
            'intake_source' => 'required|in:hotline_911,vhf_radio,walk_in,barangay_scout',
            'informant_name' => 'required|string|max:150',
            'informant_contact' => 'nullable|string|max:100',
            'rescue_unit_id' => 'required|exists:rescue_units,id',
            'victim_name' => 'required|string|max:255',
            'victim_phone' => 'nullable|string|max:50',
            'victim_latitude' => 'required|numeric|between:-90,90',
            'victim_longitude' => 'required|numeric|between:-180,180',
            'barangay' => 'nullable|string|max:100',
            'headcount' => 'required|integer|min:1|max:50',
            'special_needs' => 'nullable|string|max:255',
            'situation_description' => 'nullable|string|max:1000',
            'triage_level' => 'nullable|in:critical,urgent,standard',
            'target_shelter_id' => 'nullable|exists:shelters,id',
            'staging_point_id' => 'nullable|exists:shelters,id',
            'status' => 'nullable|in:dispatched,en_route',
            'equipments' => 'nullable|array',
            'equipments.*' => 'string|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        $unit = RescueUnit::findOrFail($validated['rescue_unit_id']);

        if (in_array($unit->status, ['en_route', 'on_scene', 'transporting'])) {
            return response()->json([
                'status' => 'error',
                'message' => "Rescue unit {$unit->name} is currently engaged in an active mission.",
            ], 422);
        }

        $initialStatus = $validated['status'] ?? 'dispatched';

        $sourceLabel = strtoupper(str_replace('_', ' ', $validated['intake_source']));
        $intakeHeader = "[{$sourceLabel} INTAKE | Informant: {$validated['informant_name']}" .
            (!empty($validated['informant_contact']) ? " ({$validated['informant_contact']})]" : "]");

        $notes = $validated['notes'] ?? '';
        $notes = $intakeHeader . (!empty($notes) ? " - {$notes}" : '');

        if (!empty($validated['equipments'])) {
            $equipStr = '[EQUIPMENT DEPLOYED]: ' . implode(', ', $validated['equipments']);
            $notes = "{$notes} | {$equipStr}";
        }

        $mission = DB::transaction(function () use ($validated, $unit, $request, $initialStatus, $notes) {
            $year = date('Y');
            $count = RescueMission::whereYear('created_at', $year)->count() + 1;
            $controlNo = 'RES-' . $year . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

            $mission = RescueMission::create([
                'control_no' => $controlNo,
                'pending_incident_id' => null,
                'rescue_unit_id' => $unit->id,
                'dispatched_by' => $request->user()->id,
                'intake_source' => $validated['intake_source'],
                'informant_name' => $validated['informant_name'],
                'status' => $initialStatus,
                'triage_level' => $validated['triage_level'] ?? 'urgent',
                'victim_name' => $validated['victim_name'],
                'victim_phone' => $validated['victim_phone'] ?? $validated['informant_contact'] ?? null,
                'victim_latitude' => ($validated['victim_latitude'] < 6.75 || $validated['victim_latitude'] > 7.30) ? 6.9142 : $validated['victim_latitude'],
                'victim_longitude' => ($validated['victim_longitude'] < 121.85 || $validated['victim_longitude'] > 122.35) ? 122.0618 : $validated['victim_longitude'],
                'barangay' => $validated['barangay'] ?? null,
                'headcount' => $validated['headcount'],
                'special_needs' => $validated['special_needs'] ?? null,
                'situation_description' => $validated['situation_description'] ?? null,
                'target_shelter_id' => $validated['target_shelter_id'] ?? null,
                'staging_point_id' => $validated['staging_point_id'] ?? null,
                'dispatched_at' => now(),
                'notes' => $notes,
            ]);

            $unit->update(['status' => $initialStatus]);

            return $mission->load(['rescueUnit', 'targetShelter', 'stagingPoint']);
        });

        // Broadcast real-time dispatch notification
        event(new RescueMissionDispatched($mission));

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'rescue_mission_hotline_intake',
            'ip_address' => $request->ip(),
            'old_values' => null,
            'new_values' => [
                'mission_id' => $mission->id,
                'control_no' => $mission->control_no,
                'intake_source' => $validated['intake_source'],
                'informant_name' => $validated['informant_name'],
                'unit_id' => $unit->id,
                'unit_name' => $unit->name,
                'triage_level' => $mission->triage_level,
                'headcount' => $mission->headcount,
            ],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Offline {$sourceLabel} intake processed. Rescue unit {$unit->name} dispatched.",
            'data' => $mission,
        ], 201);
    }

    /**
     * Stepper Status Updates: en_route -> on_scene -> transporting -> staged_at_assembly / completed.
     * Triggered by field responder on mobile or CDRRMO command desk.
     */
    public function updateStatus(Request $request, int $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:en_route,on_scene,transporting,staged_at_assembly,completed,aborted',
            'target_shelter_id' => 'nullable|exists:shelters,id',
            'staging_point_id' => 'nullable|exists:shelters,id',
            'notes' => 'nullable|string|max:1000',
            'current_latitude' => 'nullable|numeric|between:-90,90',
            'current_longitude' => 'nullable|numeric|between:-180,180',
        ]);

        $mission = RescueMission::with(['rescueUnit', 'targetShelter', 'stagingPoint'])->findOrFail($id);
        $oldStatus = $mission->status;
        $newStatus = $validated['status'];

        DB::transaction(function () use ($mission, $newStatus, $validated, $request) {
            $updates = ['status' => $newStatus];

            if ($newStatus === 'en_route' && ! $mission->dispatched_at) {
                $updates['dispatched_at'] = now();
            }

            if ($newStatus === 'on_scene') {
                $updates['arrived_at'] = now();
            }

            if (isset($validated['target_shelter_id'])) {
                $updates['target_shelter_id'] = $validated['target_shelter_id'];
            }

            if (isset($validated['staging_point_id'])) {
                $updates['staging_point_id'] = $validated['staging_point_id'];
            }

            if (isset($validated['notes'])) {
                $updates['notes'] = $validated['notes'];
            }

            if (in_array($newStatus, ['completed', 'staged_at_assembly', 'aborted'])) {
                $updates['completed_at'] = now();
            }

            $mission->update($updates);

            // Update Unit Status & Location
            // If staged_at_assembly, unit is INSTANTLY FREED (set to standby) so boat can return to flood!
            $unitUpdates = [];
            if (in_array($newStatus, ['completed', 'staged_at_assembly', 'aborted'])) {
                $unitUpdates['status'] = 'standby';
            } else {
                $unitUpdates['status'] = $newStatus;
            }

            if (isset($validated['current_latitude'], $validated['current_longitude'])) {
                $unitUpdates['current_latitude'] = $validated['current_latitude'];
                $unitUpdates['current_longitude'] = $validated['current_longitude'];
            }

            $mission->rescueUnit->update($unitUpdates);

            // =========================================================================
            // TWO-TIER STAGING HANDOVER: Evacuees dropped at safe assembly/staging point
            // =========================================================================
            if ($newStatus === 'staged_at_assembly' && isset($validated['staging_point_id'])) {
                $stagingShelter = Shelter::find($validated['staging_point_id']);
                if ($stagingShelter) {
                    $stagingShelter->increment('current_occupancy', $mission->headcount);
                    event(new ShelterStatusUpdated($stagingShelter));
                }
            }

            // =========================================================================
            // RESCUE-TO-SHELTER BRIDGE: Direct delivery to permanent evacuation shelter
            // =========================================================================
            if ($newStatus === 'completed' && $mission->target_shelter_id) {
                $shelter = Shelter::find($mission->target_shelter_id);
                if ($shelter) {
                    $newOccupancy = $shelter->current_occupancy + $mission->headcount;
                    $shelter->update(['current_occupancy' => $newOccupancy]);

                    // Look for matching family by incident reporter, phone, or name, or create provisional entry
                    $family = null;
                    if ($mission->pending_incident_id) {
                        $pending = PendingIncident::find($mission->pending_incident_id);
                        if ($pending && $pending->reported_by) {
                            $family = FamilyProfile::where('user_id', $pending->reported_by)->first();
                        }
                    }
                    if (!$family && $mission->victim_phone) {
                        $family = FamilyProfile::where('contact_number', $mission->victim_phone)->first();
                    }
                    if (!$family) {
                        $family = FamilyProfile::whereHas('user', function ($q) use ($mission) {
                            $words = preg_split('/\s+(and|&|\+)\s+/i', trim($mission->victim_name));
                            $searchName = $words[0] ?? $mission->victim_name;
                            $q->where('name', 'like', "%{$searchName}%");
                        })->first();
                    }
                    if (!$family) {
                        $tempUser = User::create([
                            'name' => $mission->victim_name,
                            'email' => 'rescued_' . $mission->id . '_' . Str::random(6) . '@evacroute.local',
                            'password' => bcrypt(Str::random(16)),
                            'role' => 'resident',
                            'status' => 'active',
                        ]);
                        $family = FamilyProfile::create([
                            'user_id' => $tempUser->id,
                            'contact_number' => $mission->victim_phone ?? 'N/A',
                            'barangay' => $mission->barangay ?: ($shelter->barangay ?: 'Zamboanga City'),
                            'headcount' => $mission->headcount,
                            'qr_code_hash' => 'RESCUED_' . Str::upper(Str::random(16)),
                        ]);
                    }

                    EvacuationLog::create([
                        'family_profile_id' => $family->id,
                        'shelter_id' => $shelter->id,
                        'checked_in_at' => now(),
                        'recorded_headcount' => $mission->headcount,
                        'checkin_method' => 'rescue_intake',
                        'notes' => "Rescued via {$mission->rescueUnit->name} (Mission {$mission->control_no})",
                    ]);

                    // Broadcast real-time shelter occupancy change to CSWDO & CDRRMO
                    event(new ShelterStatusUpdated($shelter));
                }
            }
        });

        $mission->refresh()->load(['rescueUnit', 'targetShelter', 'stagingPoint']);

        event(new RescueMissionStatusUpdated($mission));

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'rescue_mission_status_updated',
            'ip_address' => $request->ip(),
            'old_values' => ['status' => $oldStatus],
            'new_values' => ['status' => $newStatus, 'mission_id' => $mission->id],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Mission status updated to {$newStatus}.",
            'data' => $mission,
        ]);
    }

    /**
     * Citizen fast-track SOS emergency distress signal.
     */
    public function submitSOS(Request $request)
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'headcount' => 'required|integer|min:1|max:100',
            'situation' => 'nullable|string|max:1000',
            'contact_number' => 'nullable|string|max:50',
            'name' => 'nullable|string|max:255',
            'hazard_type' => 'nullable|string|max:50',
            'modifiers' => 'nullable|array',
            'modifiers.*' => 'string|max:50',
        ]);

        $user = $request->user();
        $callerName = $validated['name'] ?? $user?->name ?? 'Stranded Citizen';
        $contactNumber = $validated['contact_number'] ?? $user?->familyProfile?->contact_number ?? null;
        $hazardType = $validated['hazard_type'] ?? 'flood';
        $headcount = (int) $validated['headcount'];
        $modifiers = $validated['modifiers'] ?? [];

        $situationDesc = $validated['situation'] ?? null;
        if (empty($situationDesc)) {
            $upperHazard = strtoupper(str_replace('_', ' ', $hazardType));
            $needsPart = !empty($modifiers) ? ' Special Needs: ' . implode(', ', $modifiers) . '.' : '';
            $situationDesc = "🚨 URGENT {$upperHazard} SOS: {$headcount} person(s) stranded.{$needsPart} Immediate rescue unit requested.";
        }

        $incidentLat = (float) $validated['latitude'];
        $incidentLng = (float) $validated['longitude'];
        if ($incidentLat < 6.75 || $incidentLat > 7.30 || $incidentLng < 121.85 || $incidentLng > 122.35) {
            $incidentLat = 6.9142;
            $incidentLng = 122.0618;
        }

        $incident = PendingIncident::create([
            'reported_by' => $user ? $user->id : 1, // Fallback to system admin if guest
            'name' => "EMERGENCY SOS: {$callerName} ({$headcount} people)",
            'latitude' => $incidentLat,
            'longitude' => $incidentLng,
            'hazard_type' => $hazardType,
            'severity_level' => 'high',
            'headcount' => $headcount,
            'modifiers' => $modifiers,
            'description' => $situationDesc,
            'status' => 'pending',
        ]);

        $incident->load('reporter.familyProfile');

        // Broadcast high-priority alarm
        try {
            event(new RescueSOSAlert($incident, [
                'contact_number' => $contactNumber,
                'headcount' => $headcount,
                'hazard_type' => $hazardType,
                'modifiers' => $modifiers,
            ]));
        } catch (\Throwable $e) {
            \Log::warning('RescueSOSAlert broadcast warning: ' . $e->getMessage());
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Emergency SOS distress call received. CDRRMO Rescue Center has been alerted.',
            'data' => [
                'incident_id' => $incident->id,
                'hazard_type' => $incident->hazard_type,
                'headcount' => $incident->headcount,
                'modifiers' => $incident->modifiers,
                'status' => 'pending_rescue_dispatch',
                'reported_at' => $incident->created_at->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Register a new rescue unit / vehicle into the CDRRMO fleet.
     */
    public function storeUnit(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'call_sign' => 'required|string|max:50|unique:rescue_units,call_sign',
            'unit_type' => 'required|in:water_rescue,medical_ambulance,high_clearance_truck',
            'capacity_persons' => 'required|integer|min:1|max:100',
            'contact_number' => 'nullable|string|max:50',
            'assigned_personnel_id' => 'nullable|exists:users,id',
            'current_latitude' => 'nullable|numeric',
            'current_longitude' => 'nullable|numeric',
        ]);

        $unit = RescueUnit::create([
            'name' => $validated['name'],
            'call_sign' => strtoupper($validated['call_sign']),
            'unit_type' => $validated['unit_type'],
            'status' => 'standby',
            'capacity_persons' => $validated['capacity_persons'],
            'contact_number' => $validated['contact_number'] ?? null,
            'assigned_personnel_id' => $validated['assigned_personnel_id'] ?? null,
            'current_latitude' => $validated['current_latitude'] ?? 6.9214,
            'current_longitude' => $validated['current_longitude'] ?? 122.0790,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Rescue unit registered successfully.',
            'data' => $unit->load('assignedPersonnel'),
        ], 201);
    }
}
