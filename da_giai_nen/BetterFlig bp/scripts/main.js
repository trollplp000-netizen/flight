import { world, system } from "@minecraft/server";

const state = new Map();

const CONFIG = {
    maxBank: 12,
    bankStrength: 14,
    bankSmooth: 0.16,

    yawSmooth: 0.12,
    pitchSmooth: 0.15,

    sideOffset: 0.035,
    downOffset: 0.012,

    baseBack: -0.12,
    speedBack: -0.18,

    orbit: 0.45,

    cameraEase: 0.08,

    minPosChange: 0.003,
    minRotChange: 0.08
};

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpAngle(current, target, t) {
    let diff = ((target - current + 540) % 360) - 180;
    return current + diff * t;
}

function normalizeAngle(angle) {
    return ((angle + 180) % 360 + 360) % 360 - 180;
}

system.runInterval(() => {

    for (const player of world.getPlayers()) {

        try {

            if (!player.isGliding) {

                if (state.has(player.id))
                    player.runCommandAsync("camera @s clear");

                state.delete(player.id);
                continue;
            }

            const rot = player.getRotation();
            const vel = player.getVelocity();

            let s = state.get(player.id);

            if (!s) {
                s = {
                    bank: 0,
                    yaw: rot.y,
                    pitch: rot.x,

                    lastSide: 999,
                    lastDown: 999,
                    lastBack: 999,
                    lastYaw: 999,
                    lastPitch: 999
                };
            }

            //----------------------------------

            const speed = Math.hypot(
                vel.x,
                vel.y,
                vel.z
            );

            //----------------------------------

            const yawRad = rot.y * Math.PI / 180;

            const rightX = Math.cos(yawRad);
            const rightZ = -Math.sin(yawRad);

            const sideSpeed =
                vel.x * rightX +
                vel.z * rightZ;

            //----------------------------------

            let targetBank =
                sideSpeed *
                CONFIG.bankStrength *
                Math.min(speed * 2, 1.5);

            targetBank = Math.max(
                -CONFIG.maxBank,
                Math.min(CONFIG.maxBank, targetBank)
            );

            s.bank = lerp(
                s.bank,
                targetBank,
                CONFIG.bankSmooth
            );

            //----------------------------------

            s.yaw = lerpAngle(
                s.yaw,
                rot.y,
                CONFIG.yawSmooth
            );

            s.pitch = lerp(
                s.pitch,
                rot.x,
                CONFIG.pitchSmooth
            );

            //----------------------------------

            const orbit =
                CONFIG.orbit *
                Math.min(speed * 1.2, 1);

            const yaw = normalizeAngle(
                s.yaw +
                s.bank * orbit
            );

            const pitch =
                s.pitch -
                Math.abs(s.bank) * 0.18 -
                vel.y * 1.8;

            //----------------------------------

            const side =
                s.bank *
                CONFIG.sideOffset;

            const down =
                -Math.abs(s.bank) *
                CONFIG.downOffset;

            const back =
                CONFIG.baseBack +
                CONFIG.speedBack *
                Math.min(speed * 1.3, 1);

            //----------------------------------
            // Skip tiny updates
            //----------------------------------

            if (

                Math.abs(side - s.lastSide) < CONFIG.minPosChange &&
                Math.abs(down - s.lastDown) < CONFIG.minPosChange &&
                Math.abs(back - s.lastBack) < CONFIG.minPosChange &&
                Math.abs(yaw - s.lastYaw) < CONFIG.minRotChange &&
                Math.abs(pitch - s.lastPitch) < CONFIG.minRotChange

            ) {
                state.set(player.id, s);
                continue;
            }

            //----------------------------------

            player.runCommandAsync(
                `camera @s set minecraft:free ease ${CONFIG.cameraEase} linear pos ^${side.toFixed(3)} ^${down.toFixed(3)} ^${back.toFixed(3)} rot ${pitch.toFixed(2)} ${yaw.toFixed(2)}`
            );

            s.lastSide = side;
            s.lastDown = down;
            s.lastBack = back;
            s.lastYaw = yaw;
            s.lastPitch = pitch;

            state.set(player.id, s);

        } catch {}
    }

}, 1);