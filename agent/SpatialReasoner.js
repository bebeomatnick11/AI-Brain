'use strict';

/**
 * Astra Spatial Reasoner
 *
 * Chịu trách nhiệm:
 * - vector math
 * - hướng ánh sáng
 * - hướng bóng
 * - camera relation
 * - object relation
 * - spatial constraints
 *
 * Không tạo ảnh/video.
 */

class SpatialReasoner {

  constructor(options = {}) {
    this.epsilon =
      Number(options.epsilon || 0.000001);
  }


  vector(value, fallback = [0, 0, 0]) {

    if (
      Array.isArray(value) &&
      value.length >= 3
    ) {
      return [
        Number(value[0]) || 0,
        Number(value[1]) || 0,
        Number(value[2]) || 0
      ];
    }

    return [...fallback];
  }


  add(a, b) {

    a = this.vector(a);
    b = this.vector(b);

    return [
      a[0] + b[0],
      a[1] + b[1],
      a[2] + b[2]
    ];
  }


  subtract(a, b) {

    a = this.vector(a);
    b = this.vector(b);

    return [
      a[0] - b[0],
      a[1] - b[1],
      a[2] - b[2]
    ];
  }


  multiply(a, scalar) {

    a = this.vector(a);

    return [
      a[0] * scalar,
      a[1] * scalar,
      a[2] * scalar
    ];
  }


  dot(a, b) {

    a = this.vector(a);
    b = this.vector(b);

    return (
      a[0] * b[0] +
      a[1] * b[1] +
      a[2] * b[2]
    );
  }


  length(a) {

    a = this.vector(a);

    return Math.sqrt(
      this.dot(a, a)
    );
  }


  normalize(a) {

    a = this.vector(a);

    const length =
      this.length(a);

    if (
      length <= this.epsilon
    ) {
      return [0, 0, 0];
    }

    return [
      a[0] / length,
      a[1] / length,
      a[2] / length
    ];
  }


  distance(a, b) {

    return this.length(
      this.subtract(a, b)
    );
  }


  /**
   * Vector từ object tới source.
   *
   * Ví dụ:
   *
   * sun -> character
   *
   * = direction ánh sáng tới character.
   */
  directionBetween(
    from,
    to
  ) {

    return this.normalize(
      this.subtract(
        to,
        from
      )
    );
  }


  /**
   * Nếu light source nằm ở:
   *
   * [-10, 10, 0]
   *
   * object:
   *
   * [0, 0, 0]
   *
   * thì light direction =
   *
   * sun -> object
   *
   * Shadow direction ngược lại.
   */
  calculateLightAndShadow(
    lightPosition,
    objectPosition
  ) {

    const lightDirection =
      this.directionBetween(
        lightPosition,
        objectPosition
      );

    const shadowDirection =
      this.multiply(
        lightDirection,
        -1
      );

    return {
      lightDirection,
      shadowDirection
    };
  }


  /**
   * Kiểm tra object có đang quay
   * về phía nguồn sáng hay không.
   */
  facingLight(
    objectPosition,
    objectForward,
    lightPosition
  ) {

    const toLight =
      this.directionBetween(
        objectPosition,
        lightPosition
      );

    const forward =
      this.normalize(
        objectForward
      );

    const score =
      this.dot(
        forward,
        toLight
      );

    return {
      score,
      facing:
        score > 0.25,
      facingAway:
        score < -0.25,
      sideLit:
        Math.abs(score) <= 0.25
    };
  }


  /**
   * Tạo spatial relations giữa các object.
   */
  relate(
    a,
    b
  ) {

    const positionA =
      this.vector(a.position);

    const positionB =
      this.vector(b.position);

    const delta =
      this.subtract(
        positionB,
        positionA
      );

    const distance =
      this.length(delta);

    const relation = {
      distance,
      direction:
        this.normalize(delta),
      above:
        delta[1] > 0,
      below:
        delta[1] < 0,
      left:
        delta[0] < 0,
      right:
        delta[0] > 0,
      front:
        delta[2] < 0,
      behind:
        delta[2] > 0
    };

    return {
      from: a.id || null,
      to: b.id || null,
      ...relation
    };
  }


  /**
   * Phân tích toàn scene.
   */
  analyzeScene(
    scene = {}
  ) {

    const objects =
      Array.isArray(scene.objects)
        ? scene.objects
        : [];

    const lights =
      Array.isArray(scene.lights)
        ? scene.lights
        : [];

    const relations = [];

    for (
      let i = 0;
      i < objects.length;
      i++
    ) {

      for (
        let j = i + 1;
        j < objects.length;
        j++
      ) {

        relations.push(
          this.relate(
            objects[i],
            objects[j]
          )
        );
      }
    }


    const lighting = [];

    for (
      const light of lights
    ) {

      for (
        const object of objects
      ) {

        const result =
          this.calculateLightAndShadow(
            light.position,
            object.position
          );

        lighting.push({
          lightId:
            light.id || null,

          objectId:
            object.id || null,

          ...result
        });
      }
    }


    return {
      relations,
      lighting,
      objectCount:
        objects.length,
      lightCount:
        lights.length
    };
  }
}


module.exports =
  SpatialReasoner;
