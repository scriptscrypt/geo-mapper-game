"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  MapPin,
  Plus,
  Minus,
  MoveLeft,
  MoveRight,
  MoveUp,
  MoveDown,
  RefreshCw,
} from "lucide-react";

export function GameLayout() {
  const [timer, setTimer] = useState("01:15");
  const [points, setPoints] = useState(11111);
  const mapRef = useRef(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const [gameState, setGameState] = useState({
    score: 0,
    round: 1,
    totalRounds: 5,
    gameOver: false,
    currentLocation: null,
    guessedLocation: null,
    showScore: false,
  });

  const [mapState, setMapState] = useState({
    zoom: 3,
    center: { lat: 20, lng: 0 },
    selectedPosition: null,
    tiles: [],
    offset: { x: 0, y: 0 },
  });

  // Sample locations
  const locations = [
    { lat: 48.8584, lng: 2.2945, name: "Paris", hint: "City of Light" },
    { lat: 40.7128, lng: -74.006, name: "New York", hint: "The Big Apple" },
    { lat: -33.8688, lng: 151.2093, name: "Sydney", hint: "Harbor City" },
    { lat: 35.6762, lng: 139.6503, name: "Tokyo", hint: "Rising Sun" },
    { lat: 51.5074, lng: -0.1278, name: "London", hint: "Big Ben's Home" },
  ];

  // Coordinate conversion functions
  const latLngToTile = useCallback((lat, lng, zoom) => {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
        n
    );
    return { x, y };
  }, []);

  const tileToLatLng = useCallback((x, y, zoom) => {
    const n = Math.pow(2, zoom);
    const lng = (x / n) * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
    const lat = (latRad * 180) / Math.PI;
    return { lat, lng };
  }, []);

  // Map update logic
  const updateMapTiles = useCallback(() => {
    const { zoom, center } = mapState;
    const centerTile = latLngToTile(center.lat, center.lng, zoom);
    const tilesPerRow = Math.ceil(window.innerWidth / 256) + 2;
    const tilesPerCol = Math.ceil(window.innerHeight / 256) + 2;
    const halfWidth = Math.floor(tilesPerRow / 2);
    const halfHeight = Math.floor(tilesPerCol / 2);

    const tiles = [];
    for (let x = centerTile.x - halfWidth; x <= centerTile.x + halfWidth; x++) {
      for (
        let y = centerTile.y - halfHeight;
        y <= centerTile.y + halfHeight;
        y++
      ) {
        const normalizedX = x;
        const normalizedY = Math.max(0, Math.min(Math.pow(2, zoom) - 1, y));
        tiles.push({
          x: normalizedX,
          y: normalizedY,
          z: zoom,
          url: `/api/map/${zoom}/${normalizedX}/${normalizedY}`,
        });
      }
    }

    setMapState((prev) => ({ ...prev, tiles }));
  }, [mapState.zoom, mapState.center, latLngToTile]);

  // Initialize and handle window resize
  useEffect(() => {
    setGameState((prev) => ({
      ...prev,
      currentLocation: locations[0],
    }));

    const handleResize = () => {
      updateMapTiles();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [locations, updateMapTiles]);

  useEffect(() => {
    updateMapTiles();
  }, [mapState.zoom, mapState.center, updateMapTiles]);

  // Game logic
  const calculateDistance = (guess, actual) => {
    const R = 6371;
    const dLat = ((actual.lat - guess.lat) * Math.PI) / 180;
    const dLon = ((actual.lng - guess.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((guess.lat * Math.PI) / 180) *
        Math.cos((actual.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleGuess = () => {
    if (!mapState.selectedPosition) return;

    const distance = calculateDistance(
      mapState.selectedPosition,
      gameState.currentLocation
    );
    const points = Math.max(5000 - Math.floor(distance * 2), 0);

    setGameState((prev) => ({
      ...prev,
      score: prev.score + points,
      guessedLocation: mapState.selectedPosition,
      showScore: true,
      gameOver: prev.round >= prev.totalRounds,
    }));
  };

  const nextRound = () => {
    setGameState((prev) => ({
      ...prev,
      round: prev.round + 1,
      currentLocation: locations[prev.round],
      guessedLocation: null,
      showScore: false,
    }));
    setMapState((prev) => ({
      ...prev,
      selectedPosition: null,
      center: { lat: 20, lng: 0 },
      zoom: 3,
    }));
  };

  const restartGame = () => {
    setGameState({
      score: 0,
      round: 1,
      totalRounds: 5,
      gameOver: false,
      currentLocation: locations[0],
      guessedLocation: null,
      showScore: false,
    });
    setMapState((prev) => ({
      ...prev,
      selectedPosition: null,
      center: { lat: 20, lng: 0 },
      zoom: 3,
      offset: { x: 0, y: 0 },
    }));
  };

  // Map interaction handlers
  const handleDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragRef.current = {
      isDragging: true,
      startX: clientX - mapState.offset.x,
      startY: clientY - mapState.offset.y,
    };
    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (!dragRef.current.isDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;

    setMapState((prev) => ({
      ...prev,
      offset: { x: dx, y: dy },
    }));
  };

  const handleDragEnd = () => {
    if (!dragRef.current.isDragging) return;

    dragRef.current.isDragging = false;
    setIsDragging(false);

    const pixelsPerLng = (256 * Math.pow(2, mapState.zoom)) / 360;
    const dLng = -mapState.offset.x / pixelsPerLng;
    const dLat =
      mapState.offset.y /
      (pixelsPerLng * Math.cos((mapState.center.lat * Math.PI) / 180));

    setMapState((prev) => ({
      ...prev,
      center: {
        lat: prev.center.lat + dLat,
        lng: prev.center.lng + dLng,
      },
      offset: { x: 0, y: 0 },
    }));
  };

  const handleMapClick = useCallback(
    (e) => {
      if (isDragging) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const centerTile = latLngToTile(
        mapState.center.lat,
        mapState.center.lng,
        mapState.zoom
      );
      const clickedPosition = tileToLatLng(
        centerTile.x +
          (x - 0.5) *
            (mapState.tiles.length / Math.sqrt(mapState.tiles.length)),
        centerTile.y +
          (y - 0.5) *
            (mapState.tiles.length / Math.sqrt(mapState.tiles.length)),
        mapState.zoom
      );

      setMapState((prev) => ({
        ...prev,
        selectedPosition: clickedPosition,
      }));
    },
    [
      isDragging,
      mapState.center,
      mapState.zoom,
      mapState.tiles.length,
      latLngToTile,
      tileToLatLng,
    ]
  );

  // Map navigation
  const handlePan = (direction) => {
    const step = 100 / Math.pow(2, mapState.zoom);
    const updates = {
      left: { lng: -step },
      right: { lng: step },
      up: { lat: step },
      down: { lat: -step },
    };

    setMapState((prev) => ({
      ...prev,
      center: {
        lat: prev.center.lat + (updates[direction]?.lat || 0),
        lng: prev.center.lng + (updates[direction]?.lng || 0),
      },
    }));
  };

  const handleZoom = (delta) => {
    setMapState((prev) => ({
      ...prev,
      zoom: Math.max(2, Math.min(18, prev.zoom + delta)),
    }));
  };

  const MapMarker = ({ lat, lng, color = "red", label }) => {
    const tile = latLngToTile(lat, lng, mapState.zoom);
    const centerTile = latLngToTile(
      mapState.center.lat,
      mapState.center.lng,
      mapState.zoom
    );

    const x =
      ((tile.x - centerTile.x) /
        (mapState.tiles.length / Math.sqrt(mapState.tiles.length)) +
        0.5) *
      100;
    const y =
      ((tile.y - centerTile.y) /
        (mapState.tiles.length / Math.sqrt(mapState.tiles.length)) +
        0.5) *
      100;

    if (x < -10 || x > 110 || y < -10 || y > 110) return null;

    return (
      <div
        className="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          color: color,
          zIndex: 10,
        }}
      >
        <MapPin className="w-6 h-6" />
        {label && (
          <span className="text-xs bg-white px-1 rounded shadow">{label}</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      <header className="flex justify-between items-center p-4 bg-[#0a0a0a]">
        <div className="text-2xl font-bold">proto</div>
        <nav className="space-x-4">
          <Button
            variant="ghost"
            className="text-white hover:text-white hover:bg-[#1a1a1a]"
          >
            Profile
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:text-white hover:bg-[#1a1a1a]"
          >
            How to Play?
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:text-white hover:bg-[#1a1a1a]"
          >
            Leaderboard
          </Button>
        </nav>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Maps, Mappers & More"
              className="pl-8 bg-[#1a1a1a] text-white border-none focus:ring-1 focus:ring-[#87CEEB]"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <div className="flex items-center space-x-2 bg-[#1a1a1a] px-3 py-1 rounded-full">
            <span>{points} P</span>
            <div className="w-6 h-6 bg-[#87CEEB] rounded-full"></div>
          </div>
        </div>
      </header>

      <main className="p-4">
        <div className="flex justify-between mb-4">
          <div className="bg-[#1a1a1a] px-4 py-2 rounded-lg">Guess Mode</div>
          <div className="bg-[#1a1a1a] px-4 py-2 rounded-lg">{timer}</div>
          <div className="bg-white text-black px-4 py-2 rounded-lg">
            Round {gameState.round}/5
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-video bg-[#1a1a1a] rounded-lg overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-xl font-bold">
                {gameState.currentLocation?.hint || "Loading..."}
              </div>
            </div>
          </div>
          <div className="aspect-video bg-[#1a1a1a] rounded-lg overflow-hidden relative">
            <div
              ref={mapRef}
              className="w-full h-full relative overflow-hidden"
              onClick={handleMapClick}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
            >
              <div
                className="relative w-full h-full transition-transform duration-100"
                style={{
                  transform: `translate(${mapState.offset.x}px, ${mapState.offset.y}px)`,
                }}
              >
                {mapState.tiles.map((tile) => (
                  <img
                    key={`${tile.z}-${tile.x}-${tile.y}`}
                    src={tile.url}
                    alt=""
                    className="absolute select-none"
                    style={{
                      width: `${100 / Math.sqrt(mapState.tiles.length)}%`,
                      height: `${100 / Math.sqrt(mapState.tiles.length)}%`,
                      left: `${
                        ((tile.x - mapState.tiles[0].x) /
                          Math.sqrt(mapState.tiles.length)) *
                        100
                      }%`,
                      top: `${
                        ((tile.y - mapState.tiles[0].y) /
                          Math.sqrt(mapState.tiles.length)) *
                        100
                      }%`,
                      transition: isDragging
                        ? "none"
                        : "transform 0.1s ease-out",
                    }}
                    draggable={false}
                  />
                ))}

                {mapState.selectedPosition && !gameState.showScore && (
                  <MapMarker
                    lat={mapState.selectedPosition.lat}
                    lng={mapState.selectedPosition.lng}
                    color="blue"
                    label="Your guess"
                  />
                )}

                {gameState.showScore && (
                  <>
                    <MapMarker
                      lat={gameState.guessedLocation.lat}
                      lng={gameState.guessedLocation.lng}
                      color="blue"
                      label="Your guess"
                    />
                    <MapMarker
                      lat={gameState.currentLocation.lat}
                      lng={gameState.currentLocation.lng}
                      color="green"
                      label={gameState.currentLocation.name}
                    />
                  </>
                )}
              </div>

              {/* Map Controls */}
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white/80 p-2 rounded shadow">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleZoom(1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleZoom(-1)}
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </div>

              <div className="absolute bottom-4 right-4 z-20 grid grid-cols-3 gap-1 bg-white/80 p-2 rounded shadow">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePan("up")}
                  className="col-start-2"
                >
                  <MoveUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePan("left")}
                >
                  <MoveLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePan("down")}
                >
                  <MoveDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePan("right")}
                >
                  <MoveRight className="w-4 h-4" />
                </Button>
              </div>

              {/* OSM Attribution */}
              <div className="absolute bottom-0 right-0 bg-white/80 px-2 py-1 text-xs z-30 text-black">
                ©{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  OpenStreetMap
                </a>{" "}
                contributors
              </div>
            </div>
          </div>
        </div>

        {/* Game Controls */}
        <div className="mt-4 flex justify-center">
          {!gameState.showScore && !gameState.gameOver && (
            <Button
              className="bg-[#87CEEB] hover:bg-[#5F9EA0] text-black hover:text-black px-8 py-2 rounded-lg text-lg font-bold"
              onClick={handleGuess}
              disabled={!mapState.selectedPosition}
            >
              <MapPin className="mr-2 h-5 w-5" />
              Pin It!
            </Button>
          )}

          {gameState.showScore && !gameState.gameOver && (
            <Button
              onClick={nextRound}
              className="bg-[#87CEEB] hover:bg-[#5F9EA0] text-black hover:text-black px-8 py-2 rounded-lg text-lg font-bold"
            >
              Next Round
            </Button>
          )}

          {gameState.gameOver && (
            <Button
              onClick={restartGame}
              className="bg-[#87CEEB] hover:bg-[#5F9EA0] text-black hover:text-black px-8 py-2 rounded-lg text-lg font-bold"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Play Again
            </Button>
          )}
        </div>

        {/* Score Display */}
        {gameState.showScore && (
          <div className="mt-4 text-center bg-[#1a1a1a] p-4 rounded-lg animate-fadeIn">
            <p className="text-lg font-semibold mb-2">
              Distance:{" "}
              {calculateDistance(
                gameState.guessedLocation,
                gameState.currentLocation
              ).toFixed(1)}{" "}
              km
            </p>
            <p className="text-xl font-bold">
              Points this round:{" "}
              {Math.max(
                5000 -
                  Math.floor(
                    calculateDistance(
                      gameState.guessedLocation,
                      gameState.currentLocation
                    ) * 2
                  ),
                0
              )}
            </p>
          </div>
        )}

        {/* Game Over Summary */}
        {gameState.gameOver && (
          <div className="mt-4 text-center bg-[#1a1a1a] p-6 rounded-lg animate-fadeIn">
            <h3 className="text-xl font-bold mb-4">Game Over!</h3>
            <p className="text-lg mb-2">Final Score: {gameState.score}</p>
            <p className="text-sm text-gray-400">
              Average Score:{" "}
              {Math.round(gameState.score / gameState.totalRounds)} points per
              round
            </p>
          </div>
        )}

        <div className="mt-4 text-center text-gray-400">
          <p>Guess the location, and Pin it on the Map</p>
          <p className="mt-2">Play another round for 10 Points</p>
        </div>
      </main>
    </div>
  );
}

export default GameLayout;
