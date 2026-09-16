/**
 * The countries an address can be in — ISO 3166-1 alpha-2 codes, locally.
 *
 * Names come from the browser's own `Intl.DisplayNames`, so the list is
 * complete in every UI language without shipping a translation table and
 * without a request. The codes are data; the order is decided per locale.
 */

import { foldText, isSubsequence } from '@/domain/address/Address';

/** Every assigned ISO 3166-1 alpha-2 code. */
export const COUNTRY_CODES: readonly string[] = [
  'AD',
  'AE',
  'AF',
  'AG',
  'AI',
  'AL',
  'AM',
  'AO',
  'AQ',
  'AR',
  'AS',
  'AT',
  'AU',
  'AW',
  'AX',
  'AZ',
  'BA',
  'BB',
  'BD',
  'BE',
  'BF',
  'BG',
  'BH',
  'BI',
  'BJ',
  'BL',
  'BM',
  'BN',
  'BO',
  'BQ',
  'BR',
  'BS',
  'BT',
  'BV',
  'BW',
  'BY',
  'BZ',
  'CA',
  'CC',
  'CD',
  'CF',
  'CG',
  'CH',
  'CI',
  'CK',
  'CL',
  'CM',
  'CN',
  'CO',
  'CR',
  'CU',
  'CV',
  'CW',
  'CX',
  'CY',
  'CZ',
  'DE',
  'DJ',
  'DK',
  'DM',
  'DO',
  'DZ',
  'EC',
  'EE',
  'EG',
  'EH',
  'ER',
  'ES',
  'ET',
  'FI',
  'FJ',
  'FK',
  'FM',
  'FO',
  'FR',
  'GA',
  'GB',
  'GD',
  'GE',
  'GF',
  'GG',
  'GH',
  'GI',
  'GL',
  'GM',
  'GN',
  'GP',
  'GQ',
  'GR',
  'GS',
  'GT',
  'GU',
  'GW',
  'GY',
  'HK',
  'HM',
  'HN',
  'HR',
  'HT',
  'HU',
  'ID',
  'IE',
  'IL',
  'IM',
  'IN',
  'IO',
  'IQ',
  'IR',
  'IS',
  'IT',
  'JE',
  'JM',
  'JO',
  'JP',
  'KE',
  'KG',
  'KH',
  'KI',
  'KM',
  'KN',
  'KP',
  'KR',
  'KW',
  'KY',
  'KZ',
  'LA',
  'LB',
  'LC',
  'LI',
  'LK',
  'LR',
  'LS',
  'LT',
  'LU',
  'LV',
  'LY',
  'MA',
  'MC',
  'MD',
  'ME',
  'MF',
  'MG',
  'MH',
  'MK',
  'ML',
  'MM',
  'MN',
  'MO',
  'MP',
  'MQ',
  'MR',
  'MS',
  'MT',
  'MU',
  'MV',
  'MW',
  'MX',
  'MY',
  'MZ',
  'NA',
  'NC',
  'NE',
  'NF',
  'NG',
  'NI',
  'NL',
  'NO',
  'NP',
  'NR',
  'NU',
  'NZ',
  'OM',
  'PA',
  'PE',
  'PF',
  'PG',
  'PH',
  'PK',
  'PL',
  'PM',
  'PN',
  'PR',
  'PS',
  'PT',
  'PW',
  'PY',
  'QA',
  'RE',
  'RO',
  'RS',
  'RU',
  'RW',
  'SA',
  'SB',
  'SC',
  'SD',
  'SE',
  'SG',
  'SH',
  'SI',
  'SJ',
  'SK',
  'SL',
  'SM',
  'SN',
  'SO',
  'SR',
  'SS',
  'ST',
  'SV',
  'SX',
  'SY',
  'SZ',
  'TC',
  'TD',
  'TF',
  'TG',
  'TH',
  'TJ',
  'TK',
  'TL',
  'TM',
  'TN',
  'TO',
  'TR',
  'TT',
  'TV',
  'TW',
  'TZ',
  'UA',
  'UG',
  'UM',
  'US',
  'UY',
  'UZ',
  'VA',
  'VC',
  'VE',
  'VG',
  'VI',
  'VN',
  'VU',
  'WF',
  'WS',
  'YE',
  'YT',
  'ZA',
  'ZM',
  'ZW',
];

/** Countries offered first, in this order, before the alphabetical rest. */
export const PREFERRED_COUNTRY_CODES: readonly string[] = ['DE', 'AT', 'CH'];

/** One entry of the country list. */
export interface CountryOption {
  readonly code: string;
  readonly name: string;
}

/**
 * The country list for a locale: preferred countries first, then the rest by
 * localized name. Falls back to the code where the runtime has no name.
 */
export function countryOptions(locale: string): readonly CountryOption[] {
  const names = displayNames(locale);
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  const options = COUNTRY_CODES.map((code) => ({ code, name: names(code) }));
  const preferred = PREFERRED_COUNTRY_CODES.map((code) => options.find((o) => o.code === code)!);
  const rest = options
    .filter((option) => !PREFERRED_COUNTRY_CODES.includes(option.code))
    .sort((left, right) => collator.compare(left.name, right.name));
  return [...preferred, ...rest];
}

/**
 * The countries matching what was typed, for the combobox (R13-013). Ranked:
 * the name starting with the term, then names the term "spells" from their
 * first letter ("nie" → Niger, Nigeria), then a later word starting with the
 * term, then the term inside the name, then any other subsequence. Shorter
 * names first within a rank. Case and diacritics are folded; a two-letter
 * term also matches its ISO code.
 */
export function searchCountries(
  options: readonly CountryOption[],
  query: string,
  limit = 12,
): readonly CountryOption[] {
  const term = foldText(query.trim());
  if (!term) return options.slice(0, limit);
  const rankOf = (option: CountryOption): number => {
    const name = foldText(option.name);
    if (option.code.toLowerCase() === term) return 0;
    if (name.startsWith(term)) return 1;
    if (name[0] === term[0] && isSubsequence(term, name)) return 2;
    if (name.split(/[\s-]+/u).some((word) => word.startsWith(term))) return 3;
    if (name.includes(term)) return 4;
    if (term.length <= 6 && isSubsequence(term, name)) return 5;
    return -1;
  };
  return options
    .map((option) => ({ option, rank: rankOf(option) }))
    .filter((entry) => entry.rank >= 0)
    .sort(
      (left, right) => left.rank - right.rank || left.option.name.length - right.option.name.length,
    )
    .map((entry) => entry.option)
    .slice(0, limit);
}

/** The localized country name for a code, or the code itself. */
export function countryName(code: string, locale: string): string {
  return displayNames(locale)(code);
}

function displayNames(locale: string): (code: string) => string {
  try {
    const names = new Intl.DisplayNames([locale], { type: 'region' });
    return (code) => names.of(code) ?? code;
  } catch {
    return (code) => code;
  }
}
