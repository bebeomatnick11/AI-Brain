'use strict';

class SpatialVerifier {

  constructor(
    spatialReasoner
  ) {

    this.spatialReasoner =
      spatialReasoner;
  }


  verifyShadow(
    lightPosition,
    objectPosition,
    actualShadowDirection
  ) {

    const expected =
      this.spatialReasoner
        .calculateLightAndShadow(
          lightPosition,
          objectPosition
        )
        .shadowDirection;


    const actual =
      this.spatialReasoner
        .normalize(
          actualShadowDirection
        );


    const score =
      this.spatialReasoner.dot(
        expected,
        actual
      );


    return {
      verified:
        score >= 0.5,

      score,

      expected,
      actual,

      reason:
        score >= 0.5
          ? 'Shadow direction is spatially consistent.'
          : 'Shadow direction conflicts with the light source.'
    };
  }


  verifyScene(
    scene,
    observed = {}
  ) {

    const checks = [];

    if (
      Array.isArray(scene?.lights)
    ) {

      for (
        const light of scene.lights
      ) {

        for (
          const object of scene.objects || []
        ) {

          const observedShadow =
            observed?.shadows?.find(
              shadow =>
                shadow.objectId ===
                object.id &&
                shadow.lightId ===
                light.id
            );


          if (
            observedShadow
          ) {

            checks.push(
              this.verifyShadow(
                light.position,
                object.position,
                observedShadow.direction
              )
            );
          }
        }
      }
    }


    const failed =
      checks.filter(
        check =>
          !check.verified
      );


    return {
      verified:
        failed.length === 0,

      checks,

      failed:
        failed.length,

      score:
        checks.length
          ? checks.reduce(
              (sum, check) =>
                sum + check.score,
              0
            ) / checks.length
          : 1
    };
  }
}


module.exports =
  SpatialVerifier;
