/*
 * Platform-neutral Cherri frame construction.
 *
 * This file deliberately contains no React, DOM, canvas, or React Native code.
 * scripts/build-runtime.cjs embeds the same source in the WebView runtime and
 * Node parity tests require it directly. Keep each stage formula aligned with:
 *   LCDPROTO/components/states/HomeState.tsx
 *   LCDPROTO/components/blob/CloudCharacter.tsx
 * at the pinned source SHA recorded in LCDPROTO_SOURCE.md.
 */
(function exposeCherriFrameCore(root, factory) {
  const core = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  if (root) root.CherriFrameCore = core;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCore() {
  const BODY_FRACTION = 0.535;
  const MAX_DEFORM = 0.1;
  const MAX_BODY_DEFORM = 0.34;

  const clamp = (value, min, max) =>
    value < min ? min : value > max ? max : value;
  const value = (input, fallback = 0) =>
    input === undefined || input === null ? fallback : input;

  function buildJellyTarget(pose, ambient, options) {
    const d = pose;
    const amb = ambient;
    const driftWeight = value(options.driftWeight, 1);
    const driverYaw = value(options.driverYaw);
    const driverPitch = value(options.driverPitch);
    const dsx = value(d.blobScaleX) + value(amb.squashX);
    const dsy = value(d.blobScaleY) + value(amb.squashY);

    return {
      target: {
        x: value(amb.x) * driftWeight + value(d.blobX),
        y: value(amb.y) * driftWeight + value(d.blobY),
        depth: value(d.blobDepth),
        yaw: value(d.blobYaw) + driverYaw,
        pitch: value(d.blobPitch) + driverPitch,
        performanceYaw: value(d.blobPerformanceYaw),
        performancePitch: value(d.blobPerformancePitch),
        performanceRoll: value(d.blobPerformanceRoll),
        rotation: value(amb.rotation) + value(d.blobRotation),
        scaleX: clamp(dsx, -MAX_DEFORM, MAX_DEFORM),
        scaleY: clamp(dsy, -MAX_DEFORM, MAX_DEFORM),
        bodyX: value(d.bodyX),
        bodyY: value(d.bodyY),
        bodyRotation: value(d.bodyRotation),
        bodyScaleX: clamp(value(d.bodyScaleX), -MAX_BODY_DEFORM, MAX_BODY_DEFORM),
        bodyScaleY: clamp(value(d.bodyScaleY), -MAX_BODY_DEFORM, MAX_BODY_DEFORM),
        bodySkewX: value(d.bodySkewX),
        bodySkewY: value(d.bodySkewY),
        bodyOriginX: value(d.bodyOriginX),
        bodyOriginY: value(d.bodyOriginY, 0.82),
        bodyDeformAngle: value(d.bodyDeformAngle),
        jellyAmount: value(options.jellyAmount, 1),
        rippleAmount: value(options.rippleAmount, 1),
      },
      dsx,
      dsy,
    };
  }

  function applyDragToJellyTarget(base, pose, dragPose) {
    const d = pose;
    const target = base.target;
    target.x += value(dragPose.x);
    target.y += value(dragPose.y);
    target.rotation += value(dragPose.rotation);
    // Web preserves the full authored acting range, then adds the separately
    // bounded tactile contribution. Clamping their sum erased pancake/puff.
    target.scaleX =
      clamp(base.dsx, -0.55, 0.55) + clamp(value(dragPose.scaleX), -MAX_DEFORM, MAX_DEFORM);
    target.scaleY =
      clamp(base.dsy, -0.55, 0.55) + clamp(value(dragPose.scaleY), -MAX_DEFORM, MAX_DEFORM);
    target.bodyDeformAngle =
      value(dragPose.wallPressure) > 0.01
        ? value(dragPose.deformAngle) - value(d.bodyRotation)
        : 0;
    target.bodyScaleX =
      clamp(value(d.bodyScaleX), -0.5, 0.5) +
      clamp(value(dragPose.bodyScaleX), -MAX_BODY_DEFORM, MAX_BODY_DEFORM);
    target.bodyScaleY =
      clamp(value(d.bodyScaleY), -0.5, 0.5) +
      clamp(value(dragPose.bodyScaleY), -MAX_BODY_DEFORM, MAX_BODY_DEFORM);
    target.bodySkewX = value(d.bodySkewX) + value(dragPose.skewX);
    target.bodySkewY = value(d.bodySkewY) + value(dragPose.skewY);
    return target;
  }

  function effectiveDragRadius(pose, ambient, characterScale, cloudScale) {
    const blobScaleNow =
      (1 + value(ambient.breath)) * (1 + value(pose.blobScale));
    return 92 * blobScaleNow * characterScale * cloudScale;
  }

  function touchHitRadius(size, rig, cloudScale) {
    const visualScale = value(rig && rig.blob && rig.blob.scale, 1) * cloudScale;
    return Math.max(
      size * 0.32,
      size * BODY_FRACTION * 1.05 * visualScale,
    );
  }

  function buildRig(LCD, physical, pose, ambient, dragPose, options) {
    const d = pose;
    const deformX = clamp(value(physical.scaleX), -MAX_DEFORM, MAX_DEFORM);
    const deformY = clamp(value(physical.scaleY), -MAX_DEFORM, MAX_DEFORM);
    return LCD.applyCalibration(
      {
        blob: Object.assign({}, LCD.NEUTRAL_BLOB, {
          x: physical.x,
          y: physical.y,
          depth: physical.depth,
          yaw: physical.yaw,
          pitch: physical.pitch,
          performanceYaw: value(physical.performanceYaw),
          performancePitch: value(physical.performancePitch),
          performanceRoll: value(physical.performanceRoll),
          scale:
            options.characterScale *
            (1 + value(ambient.breath)) *
            (1 + value(d.blobScale)),
          actingScale: 1 + value(d.blobScale),
          scaleX: 1,
          scaleY: 1,
          rotation: value(physical.rotation) + value(d.blobSpin),
          opacity: value(d.blobOpacity, 1),
          faceStyle: value(d.faceStyle),
          tintR: d.emotionTintR,
          tintG: d.emotionTintG,
          tintB: d.emotionTintB,
          tintAmount: value(d.tintAmount),
        }),
        body: Object.assign({}, LCD.NEUTRAL_ELEMENT, {
          x: physical.bodyX,
          y: physical.bodyY,
          rotation: physical.bodyRotation,
          skewX: physical.bodySkewX,
          skewY: physical.bodySkewY,
          originX: physical.bodyOriginX,
          originY: physical.bodyOriginY,
          deformAngle: physical.bodyDeformAngle,
          scaleX:
            1 + deformX + clamp(value(physical.bodyScaleX), -MAX_BODY_DEFORM, MAX_BODY_DEFORM),
          scaleY:
            1 + deformY + clamp(value(physical.bodyScaleY), -MAX_BODY_DEFORM, MAX_BODY_DEFORM),
          contactX: value(dragPose.contactX),
          contactY: value(dragPose.contactY),
          contactPressure: value(dragPose.wallPressure),
          grabPressure: value(dragPose.grabPressure),
          rippleTop: value(physical.rippleTop),
          rippleUpper: value(physical.rippleUpper),
          rippleLower: value(physical.rippleLower),
          rippleBottom: value(physical.rippleBottom),
        }),
        leftEye: Object.assign({}, LCD.NEUTRAL_ELEMENT, {
          x: value(d.eyeX) + value(d.leftEyeX),
          y: value(d.eyeY) + value(d.leftEyeY),
          eyeOpen: value(d.eyeLid, 1) * value(d.leftEyeTension, 1),
          eyeSocketScaleX: 1 + value(d.leftEyeScaleX),
          eyeSocketScaleY: 1 + value(d.leftEyeScaleY),
          browLift: value(d.leftEyeTension, 1) - 1,
          browRotation: value(d.leftBrowRotation),
          pupilX: value(d.leftPupilX),
          pupilY: value(d.leftPupilY),
          pupilScale: value(d.pupilScale, 1),
          lidBias: value(d.leftLidBias),
          eyeStyle: value(d.leftEyeStyle, -1),
          scaleX: 1 + value(d.leftEyeScaleX),
          scaleY: 1 + value(d.leftEyeScaleY),
          rotation: value(d.leftEyeRotation),
        }),
        rightEye: Object.assign({}, LCD.NEUTRAL_ELEMENT, {
          x: value(d.eyeX) + value(d.rightEyeX),
          y: value(d.eyeY) + value(d.rightEyeY),
          eyeOpen: value(d.eyeLid, 1) * value(d.rightEyeTension, 1),
          eyeSocketScaleX: 1 + value(d.rightEyeScaleX),
          eyeSocketScaleY: 1 + value(d.rightEyeScaleY),
          browLift: value(d.rightEyeTension, 1) - 1,
          browRotation: value(d.rightBrowRotation),
          pupilX: value(d.rightPupilX),
          pupilY: value(d.rightPupilY),
          pupilScale: value(d.pupilScale, 1),
          lidBias: value(d.rightLidBias),
          eyeStyle: value(d.rightEyeStyle, -1),
          scaleX: 1 + value(d.rightEyeScaleX),
          scaleY: 1 + value(d.rightEyeScaleY),
          rotation: value(d.rightEyeRotation),
        }),
        mouth: Object.assign({}, LCD.NEUTRAL_ELEMENT, {
          x: value(d.mouthX),
          y: value(d.mouthY),
          scaleX: 1 + value(d.mouthScaleX),
          scaleY: 1 + value(d.mouthScaleY),
          rotation: value(d.mouthRotation),
          opacity: value(d.mouthOpacity, 1),
          mouthCurve: value(d.mouthCurve, 0.82),
          mouthO: value(d.mouthO),
          mouthD: value(d.mouthD),
          mouthCrescent: value(d.mouthCrescent),
          mouthTongue: value(d.mouthTongue),
        }),
      },
      options.calibration,
    );
  }

  function buildCloudParams(LCD, rig, physical, dragPose, options) {
    const body = rig.body;
    const blob = rig.blob;
    const press = clamp(value(body.contactPressure), 0, 1);
    const grabPress = clamp(
      body.grabPressure === undefined
        ? value(dragPose.grabPressure)
        : body.grabPressure,
      -0.2,
      1.45,
    );
    const actingWeight = 1 - clamp(Math.max(grabPress, press) * 4, 0, 1);
    const actedVolume = value(blob.actingScale, 1) - 1;
    const params = Object.assign(
      {},
      LCD.DEFAULT_DEFORMATION,
      options.cloudParams,
      options.facing,
      {
        squash: value(options.cloudParams.squash),
        stretch: value(options.cloudParams.stretch),
        actingScaleX:
          1 + (clamp(value(body.scaleX, 1), 0.72, 1.55) - 1) * actingWeight,
        actingScaleY:
          1 + (clamp(value(body.scaleY, 1), 0.7, 1.6) - 1) * actingWeight,
        actingPuff: Math.max(0, actedVolume) * actingWeight,
        puff: clamp(
          value(options.cloudParams.puff, value(LCD.DEFAULT_DEFORMATION.puff)) +
            Math.max(-0.35, actedVolume) *
              1.35 *
              (grabPress > 0.08 ? 0 : 1 - press),
          -0.25,
          0.95,
        ),
        lean:
          value(options.cloudParams.lean) +
          clamp(value(body.skewX) * 0.6, -8, 8),
        contactPressure: press,
        contactX: value(body.contactX),
        contactY: value(body.contactY),
        grabPressure: grabPress,
        faceShiftX: value(dragPose.faceShiftX),
        faceShiftY: value(dragPose.faceShiftY),
        contactDistance: value(dragPose.contactDistance),
        contactRelX: value(dragPose.contactRelX),
        contactRelY: value(dragPose.contactRelY),
        influenceRadius: value(dragPose.influenceRadius, 58),
        gripPullX: value(dragPose.gripPullX),
        gripPullY: value(dragPose.gripPullY),
        velocityX: value(dragPose.velocityX),
        velocityY: value(dragPose.velocityY),
        accelX: value(dragPose.accelX),
        accelY: value(dragPose.accelY),
        cornerBlend: value(dragPose.cornerBlend),
        dragFaceYaw: value(dragPose.faceYaw),
        dragFacePitch: value(dragPose.facePitch),
        flickStretch: value(dragPose.flickStretch),
        gazeX: clamp(value(rig.leftEye.x) / 9, -1, 1),
        gazeY: clamp(value(rig.leftEye.y) / 7, -1, 1),
      },
    );

    const depthScale = clamp(1 + value(physical.depth) * 0.28, 0.84, 1.16);
    params.scale = clamp(
      value(blob.scale, 1) * depthScale * value(options.cloudParams.scale, 1),
      0.5,
      1.42,
    );
    if (grabPress > 0.08 || press > 0.08) {
      params.scaleX = clamp(1 + (value(blob.scaleX, 1) - 1) * 0.38, 0.78, 1.22);
      params.scaleY = clamp(1 + (value(blob.scaleY, 1) - 1) * 0.38, 0.78, 1.22);
    } else {
      let scaleX = value(blob.scaleX, 1);
      let scaleY = value(blob.scaleY, 1);
      if (value(blob.scale, 1) > 1.08) {
        scaleX = Math.max(scaleX, 1);
        scaleY = Math.max(scaleY, 1);
      } else if (value(blob.scale, 1) < 0.88) {
        scaleX = Math.min(scaleX, 1);
        scaleY = Math.min(scaleY, 1);
      }
      params.scaleX = clamp(scaleX, 0.55, 1.5);
      params.scaleY = clamp(scaleY, 0.55, 1.5);
    }
    params.rotation = value(blob.rotation) + value(body.rotation) * 0.5;
    params.x =
      value(blob.x) +
      value(body.x) +
      Math.sin(options.idleTime * 0.45) * value(options.motion.driftAmount);
    params.y =
      value(blob.y) +
      value(body.y) +
      Math.sin(options.idleTime * 0.8) * value(options.motion.floatAmount);

    if (options.acceleration > 450) {
      const anticipation = clamp((options.acceleration - 450) / 5500, 0, 0.08);
      params.squash = clamp(params.squash + anticipation, 0, 0.95);
    }
    return params;
  }

  function frameVelocity(rig, previous, step, firstFrame) {
    const x = value(rig.blob.x) + value(rig.body.x);
    const y = value(rig.blob.y) + value(rig.body.y);
    const vx = firstFrame
      ? 0
      : clamp((x - previous.x) / Math.max(step, 1e-3), -1600, 1600);
    const vy = firstFrame
      ? 0
      : clamp((y - previous.y) / Math.max(step, 1e-3), -1600, 1600);
    return { x, y, vx, vy };
  }

  return {
    BODY_FRACTION,
    MAX_DEFORM,
    MAX_BODY_DEFORM,
    applyDragToJellyTarget,
    buildCloudParams,
    buildJellyTarget,
    buildRig,
    effectiveDragRadius,
    frameVelocity,
    touchHitRadius,
  };
});
