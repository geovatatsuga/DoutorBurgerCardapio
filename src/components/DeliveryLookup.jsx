import React, { useEffect, useState } from "react";
import { findDeliveryZone, onlyCepDigits } from "../../supabase/functions/_shared/delivery-zone";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

async function viaCep(path, signal) {
  const response = await fetch(`https://viacep.com.br/ws/${path}/json/`, { signal });
  if (!response.ok) throw new Error("Não foi possível consultar o endereço agora. Tente novamente.");
  return response.json();
}

export default function DeliveryLookup({ zones, selectedZone, onResolved, onReset }) {
  const [cepInput, setCepInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [city, setCity] = useState("João Pessoa");
  const [street, setStreet] = useState("");
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    const cep = onlyCepDigits(cepInput);
    if (cep.length !== 8) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const address = await viaCep(cep, controller.signal);
        if (controller.signal.aborted) return;
        if (address.erro || onlyCepDigits(address.cep) !== cep) {
          setError("CEP não encontrado. Confira os números ou busque pela rua.");
          return;
        }
        const zone = findDeliveryZone(address, zones);
        if (!zone) {
          setError("Ainda não entregamos neste endereço. Confira o CEP ou escolha retirada.");
          return;
        }
        onResolved(address, zone);
      } catch {
        if (!controller.signal.aborted) setError("Não foi possível consultar o CEP. Tente novamente.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [cepInput, zones]);

  async function searchStreet(event) {
    event.preventDefault();
    if (street.trim().length < 3) {
      setError("Digite pelo menos 3 letras da rua.");
      return;
    }
    setLoading(true);
    setError("");
    setMatches([]);
    try {
      const results = await viaCep(`PB/${encodeURIComponent(city)}/${encodeURIComponent(street.trim())}`);
      const covered = Array.isArray(results)
        ? results.filter((address) => findDeliveryZone(address, zones) && onlyCepDigits(address.cep).length === 8)
        : [];
      setMatches(covered.slice(0, 12));
      if (!covered.length) setError("Nenhum endereço atendido encontrado. Tente o CEP ou outra rua.");
    } catch {
      setError("Não foi possível buscar a rua agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="delivery-lookup">
      <label className="field">
        CEP da entrega
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={9}
          value={cepInput}
          onChange={(event) => {
            const digits = onlyCepDigits(event.target.value).slice(0, 8);
            setCepInput(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits);
            setMatches([]);
            setError("");
            onReset();
          }}
          placeholder="00000-000"
        />
      </label>
      {loading && <p role="status">Consultando endereço...</p>}
      {selectedZone && !loading && (
        <p className="delivery-quote" role="status">
          <strong>Entrega: {money.format(selectedZone.delivery_fee_cents / 100)}</strong>
          <span>{selectedZone.delivery_time_label ? `Tempo médio: ${selectedZone.delivery_time_label}` : "Área atendida"}</span>
        </p>
      )}
      {error && <p className="delivery-lookup-error" role="alert">{error}</p>}
      <button type="button" className="delivery-search-toggle" onClick={() => setSearchOpen((open) => !open)}>
        {searchOpen ? "Fechar busca por rua" : "Não sei meu CEP"}
      </button>
      {searchOpen && (
        <form onSubmit={searchStreet} className="delivery-street-search">
          <label className="field">Cidade
            <select value={city} onChange={(event) => { setCity(event.target.value); setMatches([]); }}>
              <option>João Pessoa</option>
              <option>Bayeux</option>
            </select>
          </label>
          <label className="field">Nome da rua
            <input value={street} onChange={(event) => setStreet(event.target.value)} placeholder="Ex.: Rua Clotilde Torres" />
          </label>
          <button type="submit" className="outline-btn" disabled={loading}>Buscar endereço</button>
          {matches.length > 0 && (
            <div className="delivery-street-results" aria-label="Endereços encontrados">
              {matches.map((address) => (
                <button type="button" key={`${address.cep}-${address.logradouro}`} onClick={() => {
                  const digits = onlyCepDigits(address.cep);
                  setCepInput(`${digits.slice(0, 5)}-${digits.slice(5)}`);
                  setMatches([]);
                  setSearchOpen(false);
                  onReset();
                }}>
                  {address.logradouro || "Endereço sem rua"} · {address.bairro}, {address.localidade} · {address.cep}
                </button>
              ))}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
