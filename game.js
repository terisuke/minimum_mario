// ゲームの初期化
kaboom({
    width: 1920,
    height: 1080,
    background: [135, 206, 235], // 空色の背景
    touchToMouse: true, // タッチイベントをマウスイベントに変換
    scale: 1,
    global: true,
    debug: true,
});

// 重力の設定
setGravity(1800);

// アセットの読み込み
loadBean();
loadSound("bgm", "assets/Pixelated Dreams.mp3");
loadSound("jump", "assets/ファニージャンプ.mp3");
loadSound("clear", "assets/ミニファンファーレ.mp3");
loadSound("gameover", "assets/システムエラー・不正解音.mp3");

// グローバル変数
let lives = 3; // 残機数
let coinsCollected = 0; // 取得したコイン数
let timeLimit = 20; // 時間制限（秒）
let bgmLoop; // BGMのループ再生用

// メインシーン
scene("main", () => {
    // BGMの再生開始
    if (bgmLoop) stop(bgmLoop); // 既存のBGMがあれば停止
    bgmLoop = play("bgm", { loop: true });
    
    // レベルの幅
    const LEVEL_WIDTH = 2500;
    
    // スコア表示
    const livesLabel = add([
        text("残機: " + lives, { size: 32 }),
        pos(24, 24),
        fixed(),
    ]);

    const coinsLabel = add([
        text("コイン: " + coinsCollected, { size: 32 }),
        pos(24, 64),
        fixed(),
    ]);

    const timeLabel = add([
        text("残り時間: " + timeLimit + "秒", { size: 32 }),
        pos(24, 104),
        fixed(),
    ]);

    // タイマーの設定
    let timeLeft = timeLimit;
    const timer = loop(1, () => {
        if (!player.isAlive) return;
        timeLeft--;
        timeLabel.text = "残り時間: " + timeLeft + "秒";
        
        if (timeLeft <= 0) {
            player.isAlive = false;
            stop(bgmLoop); // BGMを停止
            bgmLoop = null; // BGMの参照をクリア
            wait(0.1, () => { // BGMが確実に停止するのを待つ
                play("gameover"); // ゲームオーバー音を再生
                wait(0.5, () => {
                    go("gameover"); // タイムオーバー時は直接ゲームオーバーへ
                });
            });
        }
    });

    // プレイヤーの作成
    const player = add([
        sprite("bean"),
        pos(120, 200),
        area(),
        body(),
        {
            speed: 300,
            isAlive: true,
        },
        "player"
    ]);

    // カメラをプレイヤーに追従
    player.onUpdate(() => {
        if (!player.isAlive) return;
        
        camPos(player.pos.x, 360);
        // 画面外に出ないように制限
        if (player.pos.y > 1000) {
            player.isAlive = false;
            wait(0.5, () => {
                loseLife();
            });
        }
    });

    // 地面の作成（複数のブロックで表示）
    for (let i = 0; i < LEVEL_WIDTH/32; i++) {
        add([
            rect(32, 32),
            pos(i * 32, 500),
            color(100, 200, 100),
            area(),
            body({ isStatic: true }),
            "ground"
        ]);
    }

    // プラットフォームの追加（ランダムな位置に配置）
    const platformCount = 5;
    const platformPositions = [];
    
    for (let i = 0; i < platformCount; i++) {
        const x = rand(300, 1800); // ゴールの手前まで
        platformPositions.push([x, 350]); // 高さを固定
    }

    platformPositions.forEach(([x, y]) => {
        add([
            rect(96, 32),
            pos(x, y),
            color(100, 200, 100),
            area(),
            body({ isStatic: true }),
            "platform"
        ]);
    });

    // ゴールの作成
    add([
        rect(32, 128),
        pos(2000, 372),
        color(255, 215, 0),
        area(),
        "goal",
    ]);

    // コインの作成（ランダムな位置に配置）
    const coinCount = 10;
    const coinPositions = [];
    
    // コインを均等に配置するためのセクション分割
    const sectionWidth = (1800 - 300) / 5; // 5つのセクションに分割
    for (let i = 0; i < coinCount; i++) {
        const section = Math.floor(i / 2); // 各セクションに2個ずつ配置
        const sectionStart = 300 + section * sectionWidth;
        const x = rand(sectionStart, sectionStart + sectionWidth);
        const y = rand(250, 300); // コインの高さ範囲を調整
        coinPositions.push([x, y]);
    }

    coinPositions.forEach(([x, y]) => {
        add([
            circle(16),
            pos(x, y),
            color(255, 215, 0),
            area(),
            "coin",
        ]);
    });

    // 敵の作成（ランダムな位置に配置）
    const enemyCount = 4;
    const enemyPositions = [];
    
    // 敵を均等に配置するためのセクション分割
    const enemySectionWidth = (1800 - 300) / 4; // 4つのセクションに分割
    for (let i = 0; i < enemyCount; i++) {
        const sectionStart = 300 + i * enemySectionWidth;
        const x = rand(sectionStart, sectionStart + enemySectionWidth);
        enemyPositions.push([x, 450]);
    }

    enemyPositions.forEach(([x, y]) => {
        const moveDistance = rand(50, 100); // 移動距離を調整
        add([
            rect(32, 32),
            pos(x, y),
            color(255, 0, 0),
            area(),
            {
                moveSpeed: 100,
                dir: 1,
                startX: x,
                moveDistance: moveDistance,
            },
            "enemy"
        ]);
    });

    // 敵の動き
    onUpdate("enemy", (enemy) => {
        enemy.move(enemy.dir * enemy.moveSpeed, 0);
        if (Math.abs(enemy.pos.x - enemy.startX) > enemy.moveDistance) {
            enemy.dir = -enemy.dir;
        }
    });

    // キー入力の設定
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
            player.jump(1000);
            play("jump"); // ジャンプ音を再生
        }
    });

    // コインとの衝突判定
    onCollide("player", "coin", (p, coin) => {
        if (!p.isAlive) return;
        destroy(coin);
        coinsCollected++;
        coinsLabel.text = "コイン: " + coinsCollected;
    });

    // 敵との衝突判定（横からの接触のみゲームオーバー）
    onCollide("player", "enemy", (p, e) => {
        if (!p.isAlive) return;
        
        // プレイヤーの中心位置と敵の中心位置の差を計算
        const dx = p.pos.x - e.pos.x;
        const dy = p.pos.y - e.pos.y;
        
        // 横からの接触の場合のみゲームオーバー
        if (Math.abs(dx) > Math.abs(dy)) {
            p.isAlive = false;
            wait(0.5, () => {
                loseLife();
            });
        }
    });

    // ゴールとの衝突判定
    onCollide("player", "goal", (p, g) => {
        if (!p.isAlive) return;
        p.isAlive = false;
        stop(bgmLoop); // BGMを停止
        bgmLoop = null; // BGMの参照をクリア
        wait(0.1, () => { // BGMが確実に停止するのを待つ
            play("clear"); // クリア音を再生
            wait(0.5, () => {
                go("clear");
            });
        });
    });
});

// ゲームオーバーシーン
scene("gameover", () => {
    // シーン開始時にBGMを確実に停止
    if (bgmLoop) {
        stop(bgmLoop);
        bgmLoop = null;
    }
    
    add([
        text("GAME OVER\nスペースキーでリスタート", { size: 48 }),
        pos(width() / 2, height() / 2),
        anchor("center"),
        color(255, 0, 0),
    ]);
    
    onKeyPress("space", () => {
        lives = 3;
        coinsCollected = 0;
        timeLeft = timeLimit; // 残り時間をリセット
        go("main");
    });
});

// クリアシーン
scene("clear", () => {
    // シーン開始時にBGMを確実に停止
    if (bgmLoop) {
        stop(bgmLoop);
        bgmLoop = null;
    }
    
    add([
        text("CLEAR!\nスペースキーでリスタート", { size: 48 }),
        pos(width() / 2, height() / 2),
        anchor("center"),
        color(255, 255, 0),
    ]);

    add([
        text("取得コイン数: " + coinsCollected, { size: 32 }),
        pos(width() / 2, height() / 2 + 60),
        anchor("center"),
        color(255, 255, 0),
    ]);
    
    onKeyPress("space", () => {
        lives = 3;
        coinsCollected = 0;
        go("main");
    });
});

// 残機を減らす関数
function loseLife() {
    lives--;
    if (lives <= 0) {
        stop(bgmLoop); // BGMを停止
        bgmLoop = null; // BGMの参照をクリア
        wait(0.1, () => { // BGMが確実に停止するのを待つ
            play("gameover"); // ゲームオーバー音を再生
            wait(0.5, () => {
                go("gameover");
            });
        });
    } else {
        coinsCollected = 0;
        timeLeft = timeLimit; // 残り時間をリセット
        go("main");
    }
}

// ゲーム開始
go("main"); 