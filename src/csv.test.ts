import { describe, expect, it } from "vitest";
import { parseAmount, parseDate, parseStatement } from "./csv";

describe("parseAmount", () => {
  it("lit les formats français et anglais", () => {
    expect(parseAmount("1 234,56")).toBe(1234.56);
    expect(parseAmount("-12.50")).toBe(-12.5);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("1.234,56 €")).toBe(1234.56);
    expect(parseAmount("")).toBeNull();
  });
});

describe("parseDate", () => {
  it("lit les dates ISO et françaises", () => {
    expect(parseDate("2026-11-03 09:12:44")).toBe("2026-11-03");
    expect(parseDate("03/11/2026")).toBe("2026-11-03");
    expect(parseDate("3/1/26")).toBe("2026-01-03");
    expect(parseDate("n/a")).toBeNull();
  });
});

describe("parseStatement", () => {
  it("lit un export Revolut", () => {
    const csv = [
      "Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance",
      "CARD_PAYMENT,Current,2026-11-01 10:00:00,2026-11-02 08:00:00,Carrefour,-42.10,0.00,EUR,COMPLETED,957.90",
      "CARD_PAYMENT,Current,2026-11-03 10:00:00,,Hotel,-80.00,0.00,EUR,PENDING,",
      "TOPUP,Current,2026-11-04 10:00:00,2026-11-04 10:00:01,Top-Up,100.00,1.00,EUR,COMPLETED,1056.90",
    ].join("\n");
    expect(parseStatement(csv)).toEqual([
      {
        booked_on: "2026-11-02",
        amount: -42.1,
        label: "Carrefour",
        external_id: "2026-11-02|-42.1|Carrefour|0",
      },
      {
        booked_on: "2026-11-04",
        amount: 99,
        label: "Top-Up",
        external_id: "2026-11-04|99|Top-Up|0",
      },
    ]);
  });

  it("lit un export Crédit Agricole avec préambule, débit/crédit et libellé sur plusieurs lignes", () => {
    const csv = [
      "Téléchargement du 11/11/2026;",
      "Compte de Dépôt carte n° 00012345678;",
      "Solde au 11/11/2026 1 520,00 €;",
      "",
      "Date;Libellé;Débit euros;Crédit euros;",
      '10/11/2026;"PAIEMENT PAR CARTE\nBOULANGERIE NICE 09/11";4,20;;',
      '10/11/2026;"PAIEMENT PAR CARTE\nBOULANGERIE NICE 09/11";4,20;;',
      '05/11/2026;"VIREMENT EN VOTRE FAVEUR\nSALAIRE";;2 150,00;',
    ].join("\n");
    const txs = parseStatement(csv);
    expect(txs.map((t) => [t.booked_on, t.amount, t.label])).toEqual([
      ["2026-11-10", -4.2, "PAIEMENT PAR CARTE BOULANGERIE NICE 09/11"],
      ["2026-11-10", -4.2, "PAIEMENT PAR CARTE BOULANGERIE NICE 09/11"],
      ["2026-11-05", 2150, "VIREMENT EN VOTRE FAVEUR SALAIRE"],
    ]);
    expect(new Set(txs.map((t) => t.external_id)).size).toBe(3);
  });

  it("lit un export Revolut en français et écarte le sous-compte d'épargne", () => {
    const csv = [
      "Type,Produit,Date de début,Date de fin,Description,Montant,Frais,Devise,État,Solde",
      "Virement,Dépôt,2026-03-31 08:31:53,2026-03-31 08:31:54,À EUR Compte d'épargne,1200.00,0.00,EUR,TERMINÉ,1200.00",
      'Intérêts,Dépôt,2026-04-01 06:16:42,2026-04-01 06:16:42,"Intérêts nets versés pour Compte d&#39;épargne le Apr 1, 2026",0.04,0.00,EUR,TERMINÉ,1200.04',
      "Virement,Valeur actuelle,2026-03-31 08:31:53,2026-03-31 08:31:54,À EUR Compte d'épargne,-1200.00,0.00,EUR,TERMINÉ,35.10",
      "Paiement par carte,Valeur actuelle,2026-04-02 11:52:09,2026-04-03 12:15:15,Villeroy &amp; Boch,-103.46,0.00,EUR,TERMINÉ,29.14",
      "Paiement par carte,Valeur actuelle,2026-04-04 11:52:09,2026-04-04 12:15:15,Zara,-20.00,0.00,EUR,RENVOYÉ,29.14",
      "Valider le paiement,Valeur actuelle,2026-04-05 02:00:00,2026-04-05 02:00:01,Frais d'abonnement Premium,0.00,9.99,EUR,TERMINÉ,19.15",
    ].join("\n");
    expect(
      parseStatement(csv).map((t) => [t.booked_on, t.amount, t.label]),
    ).toEqual([
      ["2026-03-31", -1200, "À EUR Compte d'épargne"],
      ["2026-04-03", -103.46, "Villeroy & Boch"],
      ["2026-04-05", -9.99, "Frais d'abonnement Premium"],
    ]);
  });

  it("refuse un fichier sans colonnes reconnaissables", () => {
    expect(() => parseStatement("a,b\n1,2")).toThrow();
  });
});
