describe("Player movement", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 160, 160); // floor spans 16 to 144
    player = new Player(50, 50);
  });

  it("moves in the direction it is given", function () {
    player.move(new p5.Vector(1, 0), room);
    expect(player.pos.x).toBe(50 + player.speed);
    expect(player.pos.y).toBe(50);
    player.move(new p5.Vector(0, 1), room);
    expect(player.pos.y).toBe(50 + player.speed);
    player.move(new p5.Vector(-1, 0), room);
    expect(player.pos.x).toBe(50);
    player.move(new p5.Vector(0, -1), room);
    expect(player.pos.y).toBe(50);
  });
});