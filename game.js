const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
const BACKGROUND_COLOR = [135, 206, 235]; // 空色
const GRAVITY = 1800;
const INITIAL_LIVES = 3;
const TIME_LIMIT = 20; // 秒
const LEVEL_WIDTH = 2500;
const PLAYER_START_POS = [120, 200]; // 配列を使用
const PLAYER_SPEED = 300;
const PLAYER_JUMP_FORCE = 1000;
const GROUND_Y = 500;
const PLATFORM_Y = 350;
const COIN_Y_MIN = 250;
const COIN_Y_MAX = 300;
const ENEMY_Y = 450;
const ENEMY_MOVE_SPEED = 100;
const ENEMY_MOVE_DISTANCE_MIN = 50;
const ENEMY_MOVE_DISTANCE_MAX = 100;
const GOAL_X = 2000;
const GOAL_Y = 372;
const FALL_DEATH_Y = 1000;
const UI_TEXT_SIZE = 32;
const UI_MARGIN = 24;
const ENEMY_COUNT = 4;
const COIN_COUNT = 10;
const PLATFORM_COUNT = 5;
const OBJECT_START_X = 300; // オブジェクト配置開始X座標
const OBJECT_END_X = 1800; // オブジェクト配置終了X座標

kaboom({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: BACKGROUND_COLOR,
    touchToMouse: true,
    scale: 1,
    global: true,
    debug: true,
});

setGravity(GRAVITY);

loadBean();
loadSound("bgm", "assets/Pixelated Dreams.mp3");
loadSound("jump", "assets/ファニージャンプ.mp3");
loadSound("clear", "assets/ミニファンファーレ.mp3");
loadSound("gameover", "assets/システムエラー・不正解音.mp3");

let lives = INITIAL_LIVES;
let coinsCollected = 0;
let currentBGM = null; // 再生中のBGMインスタンスを管理

function playBGM(track, options = {}) {
    stopBGM(); // 既存のBGMがあれば停止
    currentBGM = play(track, { loop: true, ...options });
}

function stopBGM() {
    if (currentBGM) {
        stop(currentBGM); // stop()関数を使用
        currentBGM = null;
    }
}

function resetGameStats() {
    lives = INITIAL_LIVES;
    coinsCollected = 0;
}

function placeObjects(count, startX, endX, yPosOrRange, createObjectFunc) {
    const rangeWidth = endX - startX;
    const sectionWidth = rangeWidth / count;
    for (let i = 0; i < count; i++) {
        const sectionStart = startX + i * sectionWidth;
        const x = rand(sectionStart, sectionStart + sectionWidth);
        const y = typeof yPosOrRange === 'number' ? yPosOrRange : rand(yPosOrRange[0], yPosOrRange[1]);
        add(createObjectFunc(x, y));
    }
}

function transitionToGameOver(sound = "gameover") {
    stopBGM();
    wait(0.1, () => {
        play(sound);
        wait(0.5, () => {
            go("gameover");
        });
    });
}

function loseLife() {
    lives--;

    if (lives <= 0) {
        transitionToGameOver();
    } else {
        go("main");
    }
}

scene("main", () => {
    playBGM("bgm");
    coinsCollected = 0; // シーン開始時にコイン数をリセット
    let timeLeft = TIME_LIMIT; // シーン開始時にタイマーリセット

    for (let i = 0; i < LEVEL_WIDTH / 32; i++) {
        add([
            rect(32, 32),
            pos(i * 32, GROUND_Y),
            color(100, 200, 100),
            area(),
            body({ isStatic: true }),
            "ground",
        ]);
    }

    add([
        rect(32, 128),
        pos(GOAL_X, GOAL_Y),
        color(255, 215, 0),
        area(),
        "goal",
    ]);

    const livesLabel = add([
        text("残機: " + lives, { size: UI_TEXT_SIZE }),
        pos(UI_MARGIN, UI_MARGIN),
        fixed(),
        z(100),
    ]);

    const coinsLabel = add([
        text("コイン: " + coinsCollected, { size: UI_TEXT_SIZE }),
        pos(UI_MARGIN, UI_MARGIN * 2 + UI_TEXT_SIZE),
        fixed(),
        z(100),
    ]);

    const timeLabel = add([
        text("残り時間: " + timeLeft + "秒", { size: UI_TEXT_SIZE }),
        pos(UI_MARGIN, UI_MARGIN * 3 + UI_TEXT_SIZE * 2),
        fixed(),
        z(100),
    ]);

    const player = add([
        sprite("bean"),
        pos(PLAYER_START_POS),
        area(),
        body(),
        {
            speed: PLAYER_SPEED,
            isAlive: true,
        },
        "player",
    ]);

    const timer = loop(1, () => {
        if (!player.isAlive) return;

        timeLeft--;
        timeLabel.text = "残り時間: " + timeLeft + "秒";

        if (timeLeft <= 0) {
            if (!player.isAlive) return;
            player.isAlive = false;
            transitionToGameOver();
        }
    });

    player.onUpdate(() => {
        if (!player.isAlive) return;

        camPos(player.pos.x, GAME_HEIGHT / 2.5);

        if (player.pos.y > FALL_DEATH_Y) {
            if (!player.isAlive) return;
            player.isAlive = false;
            loseLife();
        }
    });

    player.onDestroy(() => {
        timer.cancel();
    });

    placeObjects(PLATFORM_COUNT, OBJECT_START_X, OBJECT_END_X, PLATFORM_Y, (x, y) => [
        rect(96, 32),
        pos(x, y),
        color(100, 200, 100),
        area(),
        body({ isStatic: true }),
        "platform",
    ]);

    placeObjects(COIN_COUNT, OBJECT_START_X, OBJECT_END_X, [COIN_Y_MIN, COIN_Y_MAX], (x, y) => [
        circle(16),
        pos(x, y),
        color(255, 215, 0),
        area(),
        "coin",
    ]);

    placeObjects(ENEMY_COUNT, OBJECT_START_X, OBJECT_END_X, ENEMY_Y, (x, y) => {
        const moveDistance = rand(ENEMY_MOVE_DISTANCE_MIN, ENEMY_MOVE_DISTANCE_MAX);
        return [
            rect(32, 32),
            pos(x, y),
            color(255, 0, 0),
            area(),
            {
                moveSpeed: ENEMY_MOVE_SPEED,
                dir: 1,
                startX: x,
                moveDistance: moveDistance,
            },
            "enemy",
        ];
    });

    onUpdate("enemy", (enemy) => {
        enemy.move(enemy.dir * enemy.moveSpeed, 0);
        if (Math.abs(enemy.pos.x - enemy.startX) >= enemy.moveDistance) {
            enemy.pos.x = enemy.startX + enemy.dir * enemy.moveDistance;
            enemy.dir = -enemy.dir;
        }
    });

    onKeyDown("left", () => {
        if (!player.isAlive) return;
        player.move(-player.speed, 0);
    });

    onKeyDown("right", () => {
        if (!player.isAlive) return;
        player.move(player.speed, 0);
    });

    onKeyPress("space", () => {
        if (!player.isAlive) return;
        if (player.isGrounded()) {
            player.jump(PLAYER_JUMP_FORCE);
            play("jump");
        }
    });

    onCollide("player", "coin", (p, coin) => {
        if (!p.isAlive) return;
        destroy(coin);
        coinsCollected++;
        coinsLabel.text = "コイン: " + coinsCollected;
    });

    onCollide("player", "enemy", (p, e) => {
        if (!p.isAlive) return;
        if (Math.abs(p.pos.y - e.pos.y) < p.height / 2 + e.height / 2 - 10) {
            if (!p.isAlive) return;
            p.isAlive = false;
            loseLife();
        }
    });

    onCollide("player", "goal", (p, g) => {
        if (!p.isAlive) return;
        p.isAlive = false;
        stopBGM();
        wait(0.1, () => {
            play("clear");
            wait(0.5, () => {
                go("clear");
            });
        });
    });
});

scene("gameover", () => {
    stopBGM();

    add([
        text("GAME OVER\nスペースキーでリスタート", {
            size: 48,
            align: "center",
        }),
        pos(width() / 2, height() / 2),
        anchor("center"),
        color(255, 0, 0),
    ]);

    onKeyPress("space", () => {
        resetGameStats();
        go("main");
    });
});

scene("clear", () => {
    stopBGM();

    add([
        text("CLEAR!\nスペースキーでリスタート", {
            size: 48,
            align: "center",
        }),
        pos(width() / 2, height() / 2 - 40), // 少し上に調整
        anchor("center"),
        color(255, 255, 0),
    ]);

    add([
        text("取得コイン数: " + coinsCollected, { size: UI_TEXT_SIZE }),
        pos(width() / 2, height() / 2 + 60),
        anchor("center"),
        color(255, 255, 0),
    ]);

    onKeyPress("space", () => {
        resetGameStats(); // ゲーム状態をリセット
        go("main");
    });
});

go("main"); 