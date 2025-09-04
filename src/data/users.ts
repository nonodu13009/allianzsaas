export type UserRecord = {
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  gender: "h" | "f";
  company: string;
  grade: string;
};

export const users: UserRecord[] = [
  { email: "jeanmichel@allianz-nogaro.fr", role: "administrateur", firstName: "Jean-Michel", lastName: "Nogaro", gender: "h", company: "allianz", grade: "agent" },
  { email: "julien.boetti@allianz-nogaro.fr", role: "administrateur", firstName: "Julien", lastName: "Boetti", gender: "h", company: "allianz", grade: "agent" },
  { email: "gwendal.clouet@allianz-nogaro.fr", role: "CDC_commercial", firstName: "Gwendal", lastName: "Clouet", gender: "h", company: "allianz", grade: "non-cadre" },
  { email: "emma@allianz-nogaro.fr", role: "CDC_commercial", firstName: "Emma", lastName: "Nogaro", gender: "f", company: "allianz", grade: "alternant" },
  { email: "joelle.abikaram@allianz-nogaro.fr", role: "CDC_commercial", firstName: "Joëlle", lastName: "Abi Karam", gender: "f", company: "allianz", grade: "non-cadre" },
  { email: "astrid.ulrich@allianz-nogaro.fr", role: "CDC_commercial", firstName: "Astrid", lastName: "Ulrich", gender: "f", company: "allianz", grade: "non-cadre" },
  { email: "karen.chollet@allianz-nogaro.fr", role: "CDC_santé_coll", firstName: "Karen", lastName: "Chollet", gender: "f", company: "allianz", grade: "cadre" },
  { email: "kheira.bagnasco@allianz-nogaro.fr", role: "CDC_santé_ind", firstName: "Kheira", lastName: "Bagnasco", gender: "f", company: "allianz", grade: "non-cadre" },
  { email: "virginie.tommasini@allianz-nogaro.fr", role: "CDC_sinistre", firstName: "Virginie", lastName: "Tommasini", gender: "f", company: "allianz", grade: "cadre" },
  { email: "nejma.hariati@allianz-nogaro.fr", role: "CDC_sinistre", firstName: "Nejma", lastName: "Hariati", gender: "f", company: "allianz", grade: "non-cadre" },
  { email: "corentin.ulrich@allianz-nogaro.fr", role: "CDC_commercial", firstName: "Corentin", lastName: "Ulrich", gender: "h", company: "allianz", grade: "non-cadre" },
  { email: "donia.sahraoui@allianz-nogaro.fr", role: "CDC_commercial", firstName: "Donia", lastName: "Sahraoui", gender: "f", company: "allianz", grade: "non-cadre" },
];

export function findUserByEmail(email: string): UserRecord | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized);
}

function normalizeRole(role: string): string {
  return role
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .replace(/\s+/g, "_");
}

const ROLE_LABELS: Record<string, string> = {
  administrateur: "Administrateur",
  cdc_commercial: "CDC Commercial",
  cdc_sante_ind: "CDC Santé Ind",
  cdc_sante_coll: "CC Santé Coll",
  cdc_sinistre: "CDC Sinistre",
};

export function getRoleDisplayName(role: string): string {
  const key = normalizeRole(role);
  return ROLE_LABELS[key] ?? role;
}


