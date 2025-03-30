// --- 定数定義 ---
const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
const BACKGROUND_COLOR = [135, 206, 235]; // 空色
const GRAVITY = 1800;
const INITIAL_LIVES = 3;
const TIME_LIMIT = 20; // 秒
const LEVEL_WIDTH = 2500;
const PLAYER_START_POS = [120, 200]; // vec2の代わりに配列を使用
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

// --- ゲーム初期化 ---
kaboom({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: BACKGROUND_COLOR,
    touchToMouse: true,
    scale: 1,
    global: true,
    debug: true,
});

// --- 重力設定 ---
setGravity(GRAVITY);

// --- アセット読み込み ---
loadBean();
loadSound("bgm", "assets/Pixelated Dreams.mp3");
loadSound("jump", "assets/ファニージャンプ.mp3");
loadSound("clear", "assets/ミニファンファーレ.mp3");
loadSound("gameover", "assets/システムエラー・不正解音.mp3");

// --- グローバル変数 ---
let lives = INITIAL_LIVES;
let coinsCollected = 0;
let currentBGM = null; // 再生中のBGMインスタンスを管理

// --- BGM管理関数 ---
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

// --- 状態リセット関数 ---
function resetGameStats() {
    lives = INITIAL_LIVES;
    coinsCollected = 0;
    // 時間は main シーン開始時にリセット
}

// --- 残機を減らす関数 ---
function loseLife() {
    lives--;
    stopBGM(); // やられたらBGM停止

    if (lives <= 0) {
        // 少し待ってからゲームオーバー効果音とシーン遷移
        wait(0.1, () => {
            play("gameover");
            wait(0.5, () => {
                go("gameover");
            });
        });
    } else {
        // 残機があればメインシーンをリスタート
        // コイン数はリセットされる (mainシーン開始時に0になる)
        go("main");
    }
}

// --- メインシーン ---
scene("main", () => {
    playBGM("bgm");
    coinsCollected = 0; // シーン開始時にコイン数をリセット
    let timeLeft = TIME_LIMIT; // シーン開始時にタイマーリセット

    // レベル全体の定義
    const levelConf = {
        width: 32,
        height: 32,
        // "=" : 地面ブロック
        "=": () => [
            rect(32, 32),
            color(100, 200, 100),
            area(),
            body({ isStatic: true }),
            "ground",
        ],
        // "*" : ゴール
        "*": () => [
            rect(32, 128), // サイズ調整
            pos(0, -96), // Y座標を地面に合わせるためのオフセット
            color(255, 215, 0),
            area(),
            "goal",
        ],
        // 他の要素はコードで直接配置
    };

    // 地面の生成 (シンプル化のため addLevel は使わずループで生成)
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

    // ゴールの配置
    add([
        rect(32, 128),
        pos(GOAL_X, GOAL_Y),
        color(255, 215, 0),
        area(),
        "goal",
    ]);

    // UI表示
    const livesLabel = add([
        text("残機: " + lives, { size: UI_TEXT_SIZE }),
        pos(UI_MARGIN, UI_MARGIN),
        fixed(), // UIを画面に固定
        z(100), // UIが手前に表示されるように
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

    // プレイヤーの作成
    const player = add([
        sprite("bean"),
        pos(PLAYER_START_POS),
        area(),
        body(), // 物理演算を有効化
        { // カスタムプロパティ
            speed: PLAYER_SPEED,
            isAlive: true, // 生存フラグ
        },
        "player",
    ]);

    // タイマーの設定
    const timer = loop(1, () => {
        if (!player.isAlive) return; // プレイヤーが死んでいたら何もしない

        timeLeft--;
        timeLabel.text = "残り時間: " + timeLeft + "秒";

        if (timeLeft <= 0) {
            if (!player.isAlive) return; // 二重実行防止
            player.isAlive = false;
            stopBGM();
            wait(0.1, () => { // 効果音再生のための短い待機
                play("gameover");
                wait(0.5, () => { // シーン遷移のための待機
                    go("gameover"); // タイムオーバー時は直接ゲームオーバーへ
                });
            });
        }
    });

    // カメラをプレイヤーに追従 & 落下死判定
    player.onUpdate(() => {
        if (!player.isAlive) return;

        // カメラ位置をプレイヤーに追従させる (Y座標は固定気味に)
        camPos(player.pos.x, GAME_HEIGHT / 2.5);

        // 落下死判定
        if (player.pos.y > FALL_DEATH_Y) {
            if (!player.isAlive) return; // 二重実行防止
            player.isAlive = false;
            loseLife(); // 残機を減らす処理へ
        }
    });

    // プラットフォームの配置 (ランダム)
    for (let i = 0; i < PLATFORM_COUNT; i++) {
        const x = rand(OBJECT_START_X, OBJECT_END_X);
        add([
            rect(96, 32),
            pos(x, PLATFORM_Y),
            color(100, 200, 100),
            area(),
            body({ isStatic: true }),
            "platform", // 必要であればタグ付け
        ]);
    }

    // コインの配置 (ランダム、ある程度分散)
    const sectionWidth = (OBJECT_END_X - OBJECT_START_X) / COIN_COUNT;
    for (let i = 0; i < COIN_COUNT; i++) {
        const sectionStart = OBJECT_START_X + i * sectionWidth;
        const x = rand(sectionStart, sectionStart + sectionWidth);
        const y = rand(COIN_Y_MIN, COIN_Y_MAX);
        add([
            circle(16),
            pos(x, y),
            color(255, 215, 0),
            area(),
            "coin",
        ]);
    }

    // 敵の配置 (ランダム、ある程度分散)
    const enemySectionWidth = (OBJECT_END_X - OBJECT_START_X) / ENEMY_COUNT;
    for (let i = 0; i < ENEMY_COUNT; i++) {
        const sectionStart = OBJECT_START_X + i * enemySectionWidth;
        const x = rand(sectionStart, sectionStart + enemySectionWidth);
        const moveDistance = rand(ENEMY_MOVE_DISTANCE_MIN, ENEMY_MOVE_DISTANCE_MAX);
        add([
            rect(32, 32),
            pos(x, ENEMY_Y),
            color(255, 0, 0),
            area(),
            { // 敵の状態
                moveSpeed: ENEMY_MOVE_SPEED,
                dir: 1, // 移動方向 (1: 右, -1: 左)
                startX: x,
                moveDistance: moveDistance,
            },
            "enemy",
        ]);
    }

    // 敵の動き
    onUpdate("enemy", (enemy) => {
        enemy.move(enemy.dir * enemy.moveSpeed, 0);
        // 指定距離移動したら反転
        if (Math.abs(enemy.pos.x - enemy.startX) >= enemy.moveDistance) {
            // 行き過ぎないように位置を調整
            enemy.pos.x = enemy.startX + enemy.dir * enemy.moveDistance;
            enemy.dir = -enemy.dir; // 方向転換
        }
    });

    // --- キー入力 ---
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
        // 地面に接しているときだけジャンプ
        if (player.isGrounded()) {
            player.jump(PLAYER_JUMP_FORCE);
            play("jump");
        }
    });

    // --- 衝突判定 ---
    onCollide("player", "coin", (p, coin) => {
        if (!p.isAlive) return;
        destroy(coin);
        coinsCollected++;
        coinsLabel.text = "コイン: " + coinsCollected;
    });

    onCollide("player", "enemy", (p, e) => {
        if (!p.isAlive) return;

        // プレイヤーが敵より上にいて、かつ落下中の場合（踏んだ場合）
        // Note: より正確な判定には衝突方向のベクトルなどを使うと良い
        // if (!p.isGrounded() && p.pos.y < e.pos.y - e.height / 2) {
        //    destroy(e); // 敵を消す
        //    p.jump(PLAYER_JUMP_FORCE / 1.5); // 小ジャンプ
        // } else {
            // 横からの接触と判定（簡易的な判定）
            // 中心同士のY座標が近い場合に横からの接触とみなす
            if (Math.abs(p.pos.y - e.pos.y) < p.height / 2 + e.height / 2 - 10) { // Y座標がある程度近い
                 if (!p.isAlive) return; // 二重実行防止
                 p.isAlive = false;
                 loseLife(); // 残機を減らす処理へ
            }
        // }
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

    // 注意: loopタイマーはシーンを抜けても自動で止まらない場合がある
    // player.isAlive フラグで制御しているため、大きな問題はないが、
    // 必要であればシーン離脱時に timer.cancel() を呼ぶ
    player.onDestroy(() => {
        timer.cancel(); // プレイヤーが破棄されるタイミングでタイマー停止 (念のため)
    });

});

// --- ゲームオーバーシーン ---
scene("gameover", () => {
    stopBGM(); // シーン開始時にBGMを確実に停止

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
        resetGameStats(); // ゲーム状態をリセット
        go("main");
    });
});

// --- クリアシーン ---
scene("clear", () => {
    stopBGM(); // シーン開始時にBGMを確実に停止

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

// --- ゲーム開始 ---
go("main"); 