import React, { useState } from "react";
import "./BurgerShowcase.css";

const assembledImage = "/assets/visual-exploration/duplo-assembled.webp";
const explodedImage = "/assets/visual-exploration/duplo-exploded.webp";
const layers = [
  { top: 0, bottom: 34, start: "48px", group: "bread" },
  { top: 34, bottom: 52, start: "25px", group: "toppings" },
  { top: 52, bottom: 66, start: "6px", group: "meat" },
  { top: 66, bottom: 79, start: "-12px", group: "meat" },
  { top: 79, bottom: 100, start: "-30px", group: "bread" },
];

const ingredients = [
  { id: "bread", label: "Brioche" },
  { id: "toppings", label: "Bacon e cebola" },
  { id: "meat", label: "Duplo blend" },
];

export default function BurgerShowcase({ product, onOpen, priceLabel }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState("");
  const [hoveredLayer, setHoveredLayer] = useState("");
  const activeLayer = hoveredLayer || selectedLayer;
  const isExploded = open || hovered || Boolean(hoveredLayer);

  return (
    <div className={`burger-showcase${isExploded ? " is-exploded" : ""}`} data-active-layer={isExploded ? activeLayer : ""} aria-label={`Destaque: ${product.name}`}>
      <button
        type="button"
        className="burger-showcase__visual"
        aria-label={isExploded ? "Ver o Duplo montado" : "Explorar as camadas do Duplo"}
        aria-pressed={open}
        onClick={(event) => {
          if (event.detail === 0 || !window.matchMedia("(hover: hover)").matches) {
            setOpen((current) => !current);
            setSelectedLayer("");
          }
        }}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
      >
        <img className="burger-showcase__assembled" src={assembledImage} alt="" width="1254" height="1254" decoding="async" fetchPriority="high" />
        {layers.map((layer, index) => (
          <img
            key={index}
            className={`burger-showcase__layer burger-showcase__layer--${layer.group}`}
            src={explodedImage}
            alt=""
            aria-hidden="true"
            width="1254"
            height="1254"
            decoding="async"
            style={{ clipPath: `inset(${layer.top}% 0 ${100 - layer.bottom}% 0)`, "--start-y": layer.start, "--delay": `${index * 45}ms` }}
          />
        ))}
        <span className="burger-showcase__label burger-showcase__label--bun">Brioche tostado</span>
        <span className="burger-showcase__label burger-showcase__label--toppings">Bacon e cebola</span>
        <span className="burger-showcase__label burger-showcase__label--meat">2 blends + cheddar</span>
      </button>

      <div className="burger-showcase__bottom">
        <div className="burger-showcase__product">
          <span>Especial da casa</span>
          <strong>{product.name}</strong>
          <div className="burger-showcase__price">
            <div><small>A partir de</small><b>{priceLabel}</b></div>
          </div>
        </div>
        <button type="button" className="burger-showcase__order" onClick={() => onOpen(product.id)}><span className="burger-showcase__order-long">Montar meu Duplo</span><span className="burger-showcase__order-short">Montar</span></button>
      </div>
      <div className="burger-showcase__ingredients" role="group" aria-label="Ingredientes do Duplo">
        {ingredients.map((ingredient) => (
          <button
            key={ingredient.id}
            type="button"
            className={activeLayer === ingredient.id && isExploded ? "is-active" : ""}
            aria-pressed={activeLayer === ingredient.id && isExploded}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") setHoveredLayer(ingredient.id); }}
            onPointerLeave={() => setHoveredLayer("")}
            onClick={() => { setOpen(true); setSelectedLayer((current) => current === ingredient.id ? "" : ingredient.id); }}
          >{ingredient.label}</button>
        ))}
      </div>
    </div>
  );
}
