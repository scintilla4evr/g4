#ifdef GL_ES
    precision mediump float;
#endif

uniform sampler2D u_game;

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec3 color = texture2D(u_game, st).rgb;

    gl_FragColor = vec4(color, 1.0);
}
