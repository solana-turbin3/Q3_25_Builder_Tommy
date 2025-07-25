/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  combineCodec,
  fixDecoderSize,
  fixEncoderSize,
  getAddressEncoder,
  getBytesDecoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  getStructDecoder,
  getStructEncoder,
  getU64Decoder,
  getU64Encoder,
  transformEncoder,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
  type IAccountMeta,
  type IAccountSignerMeta,
  type IInstruction,
  type IInstructionWithAccounts,
  type IInstructionWithData,
  type ReadonlyAccount,
  type ReadonlyUint8Array,
  type TransactionSigner,
  type WritableAccount,
  type WritableSignerAccount,
} from '@solana/kit';
import { ESCROW_PROGRAM_ADDRESS } from '../programs';
import {
  expectAddress,
  expectSome,
  getAccountMetaFactory,
  type ResolvedAccount,
} from '../shared';

export const MAKE_OFFER_DISCRIMINATOR = new Uint8Array([
  214, 98, 97, 35, 59, 12, 44, 178,
]);

export function getMakeOfferDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(MAKE_OFFER_DISCRIMINATOR);
}

export type MakeOfferInstruction<
  TProgram extends string = typeof ESCROW_PROGRAM_ADDRESS,
  TAccountMaker extends string | IAccountMeta<string> = string,
  TAccountTokenMintA extends string | IAccountMeta<string> = string,
  TAccountTokenMintB extends string | IAccountMeta<string> = string,
  TAccountMakerTokenAccountA extends string | IAccountMeta<string> = string,
  TAccountOfferDetails extends string | IAccountMeta<string> = string,
  TAccountVault extends string | IAccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | IAccountMeta<string> = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountAssociatedTokenProgram extends
    | string
    | IAccountMeta<string> = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  TRemainingAccounts extends readonly IAccountMeta<string>[] = [],
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountMaker extends string
        ? WritableSignerAccount<TAccountMaker> &
            IAccountSignerMeta<TAccountMaker>
        : TAccountMaker,
      TAccountTokenMintA extends string
        ? ReadonlyAccount<TAccountTokenMintA>
        : TAccountTokenMintA,
      TAccountTokenMintB extends string
        ? ReadonlyAccount<TAccountTokenMintB>
        : TAccountTokenMintB,
      TAccountMakerTokenAccountA extends string
        ? WritableAccount<TAccountMakerTokenAccountA>
        : TAccountMakerTokenAccountA,
      TAccountOfferDetails extends string
        ? WritableAccount<TAccountOfferDetails>
        : TAccountOfferDetails,
      TAccountVault extends string
        ? WritableAccount<TAccountVault>
        : TAccountVault,
      TAccountTokenProgram extends string
        ? ReadonlyAccount<TAccountTokenProgram>
        : TAccountTokenProgram,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountAssociatedTokenProgram extends string
        ? ReadonlyAccount<TAccountAssociatedTokenProgram>
        : TAccountAssociatedTokenProgram,
      ...TRemainingAccounts,
    ]
  >;

export type MakeOfferInstructionData = {
  discriminator: ReadonlyUint8Array;
  id: bigint;
  tokenAOfferedAmount: bigint;
  tokenBWantedAmount: bigint;
};

export type MakeOfferInstructionDataArgs = {
  id: number | bigint;
  tokenAOfferedAmount: number | bigint;
  tokenBWantedAmount: number | bigint;
};

export function getMakeOfferInstructionDataEncoder(): Encoder<MakeOfferInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['id', getU64Encoder()],
      ['tokenAOfferedAmount', getU64Encoder()],
      ['tokenBWantedAmount', getU64Encoder()],
    ]),
    (value) => ({ ...value, discriminator: MAKE_OFFER_DISCRIMINATOR })
  );
}

export function getMakeOfferInstructionDataDecoder(): Decoder<MakeOfferInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['id', getU64Decoder()],
    ['tokenAOfferedAmount', getU64Decoder()],
    ['tokenBWantedAmount', getU64Decoder()],
  ]);
}

export function getMakeOfferInstructionDataCodec(): Codec<
  MakeOfferInstructionDataArgs,
  MakeOfferInstructionData
> {
  return combineCodec(
    getMakeOfferInstructionDataEncoder(),
    getMakeOfferInstructionDataDecoder()
  );
}

export type MakeOfferAsyncInput<
  TAccountMaker extends string = string,
  TAccountTokenMintA extends string = string,
  TAccountTokenMintB extends string = string,
  TAccountMakerTokenAccountA extends string = string,
  TAccountOfferDetails extends string = string,
  TAccountVault extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountAssociatedTokenProgram extends string = string,
> = {
  maker: TransactionSigner<TAccountMaker>;
  tokenMintA: Address<TAccountTokenMintA>;
  tokenMintB: Address<TAccountTokenMintB>;
  makerTokenAccountA?: Address<TAccountMakerTokenAccountA>;
  offerDetails?: Address<TAccountOfferDetails>;
  vault?: Address<TAccountVault>;
  tokenProgram?: Address<TAccountTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  associatedTokenProgram?: Address<TAccountAssociatedTokenProgram>;
  id: MakeOfferInstructionDataArgs['id'];
  tokenAOfferedAmount: MakeOfferInstructionDataArgs['tokenAOfferedAmount'];
  tokenBWantedAmount: MakeOfferInstructionDataArgs['tokenBWantedAmount'];
};

export async function getMakeOfferInstructionAsync<
  TAccountMaker extends string,
  TAccountTokenMintA extends string,
  TAccountTokenMintB extends string,
  TAccountMakerTokenAccountA extends string,
  TAccountOfferDetails extends string,
  TAccountVault extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TProgramAddress extends Address = typeof ESCROW_PROGRAM_ADDRESS,
>(
  input: MakeOfferAsyncInput<
    TAccountMaker,
    TAccountTokenMintA,
    TAccountTokenMintB,
    TAccountMakerTokenAccountA,
    TAccountOfferDetails,
    TAccountVault,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountAssociatedTokenProgram
  >,
  config?: { programAddress?: TProgramAddress }
): Promise<
  MakeOfferInstruction<
    TProgramAddress,
    TAccountMaker,
    TAccountTokenMintA,
    TAccountTokenMintB,
    TAccountMakerTokenAccountA,
    TAccountOfferDetails,
    TAccountVault,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountAssociatedTokenProgram
  >
> {
  // Program address.
  const programAddress = config?.programAddress ?? ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    maker: { value: input.maker ?? null, isWritable: true },
    tokenMintA: { value: input.tokenMintA ?? null, isWritable: false },
    tokenMintB: { value: input.tokenMintB ?? null, isWritable: false },
    makerTokenAccountA: {
      value: input.makerTokenAccountA ?? null,
      isWritable: true,
    },
    offerDetails: { value: input.offerDetails ?? null, isWritable: true },
    vault: { value: input.vault ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    associatedTokenProgram: {
      value: input.associatedTokenProgram ?? null,
      isWritable: false,
    },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value =
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address<'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'>;
  }
  if (!accounts.makerTokenAccountA.value) {
    accounts.makerTokenAccountA.value = await getProgramDerivedAddress({
      programAddress:
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address<'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'>,
      seeds: [
        getAddressEncoder().encode(expectAddress(accounts.maker.value)),
        getAddressEncoder().encode(expectAddress(accounts.tokenProgram.value)),
        getAddressEncoder().encode(expectAddress(accounts.tokenMintA.value)),
      ],
    });
  }
  if (!accounts.offerDetails.value) {
    accounts.offerDetails.value = await getProgramDerivedAddress({
      programAddress,
      seeds: [
        getBytesEncoder().encode(new Uint8Array([111, 102, 102, 101, 114])),
        getAddressEncoder().encode(expectAddress(accounts.maker.value)),
        getU64Encoder().encode(expectSome(args.id)),
      ],
    });
  }
  if (!accounts.vault.value) {
    accounts.vault.value = await getProgramDerivedAddress({
      programAddress:
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address<'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'>,
      seeds: [
        getAddressEncoder().encode(expectAddress(accounts.offerDetails.value)),
        getAddressEncoder().encode(expectAddress(accounts.tokenProgram.value)),
        getAddressEncoder().encode(expectAddress(accounts.tokenMintA.value)),
      ],
    });
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }
  if (!accounts.associatedTokenProgram.value) {
    accounts.associatedTokenProgram.value =
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address<'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.maker),
      getAccountMeta(accounts.tokenMintA),
      getAccountMeta(accounts.tokenMintB),
      getAccountMeta(accounts.makerTokenAccountA),
      getAccountMeta(accounts.offerDetails),
      getAccountMeta(accounts.vault),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.associatedTokenProgram),
    ],
    programAddress,
    data: getMakeOfferInstructionDataEncoder().encode(
      args as MakeOfferInstructionDataArgs
    ),
  } as MakeOfferInstruction<
    TProgramAddress,
    TAccountMaker,
    TAccountTokenMintA,
    TAccountTokenMintB,
    TAccountMakerTokenAccountA,
    TAccountOfferDetails,
    TAccountVault,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountAssociatedTokenProgram
  >;

  return instruction;
}

export type MakeOfferInput<
  TAccountMaker extends string = string,
  TAccountTokenMintA extends string = string,
  TAccountTokenMintB extends string = string,
  TAccountMakerTokenAccountA extends string = string,
  TAccountOfferDetails extends string = string,
  TAccountVault extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountAssociatedTokenProgram extends string = string,
> = {
  maker: TransactionSigner<TAccountMaker>;
  tokenMintA: Address<TAccountTokenMintA>;
  tokenMintB: Address<TAccountTokenMintB>;
  makerTokenAccountA: Address<TAccountMakerTokenAccountA>;
  offerDetails: Address<TAccountOfferDetails>;
  vault: Address<TAccountVault>;
  tokenProgram?: Address<TAccountTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  associatedTokenProgram?: Address<TAccountAssociatedTokenProgram>;
  id: MakeOfferInstructionDataArgs['id'];
  tokenAOfferedAmount: MakeOfferInstructionDataArgs['tokenAOfferedAmount'];
  tokenBWantedAmount: MakeOfferInstructionDataArgs['tokenBWantedAmount'];
};

export function getMakeOfferInstruction<
  TAccountMaker extends string,
  TAccountTokenMintA extends string,
  TAccountTokenMintB extends string,
  TAccountMakerTokenAccountA extends string,
  TAccountOfferDetails extends string,
  TAccountVault extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TProgramAddress extends Address = typeof ESCROW_PROGRAM_ADDRESS,
>(
  input: MakeOfferInput<
    TAccountMaker,
    TAccountTokenMintA,
    TAccountTokenMintB,
    TAccountMakerTokenAccountA,
    TAccountOfferDetails,
    TAccountVault,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountAssociatedTokenProgram
  >,
  config?: { programAddress?: TProgramAddress }
): MakeOfferInstruction<
  TProgramAddress,
  TAccountMaker,
  TAccountTokenMintA,
  TAccountTokenMintB,
  TAccountMakerTokenAccountA,
  TAccountOfferDetails,
  TAccountVault,
  TAccountTokenProgram,
  TAccountSystemProgram,
  TAccountAssociatedTokenProgram
> {
  // Program address.
  const programAddress = config?.programAddress ?? ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    maker: { value: input.maker ?? null, isWritable: true },
    tokenMintA: { value: input.tokenMintA ?? null, isWritable: false },
    tokenMintB: { value: input.tokenMintB ?? null, isWritable: false },
    makerTokenAccountA: {
      value: input.makerTokenAccountA ?? null,
      isWritable: true,
    },
    offerDetails: { value: input.offerDetails ?? null, isWritable: true },
    vault: { value: input.vault ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    associatedTokenProgram: {
      value: input.associatedTokenProgram ?? null,
      isWritable: false,
    },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value =
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address<'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'>;
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }
  if (!accounts.associatedTokenProgram.value) {
    accounts.associatedTokenProgram.value =
      'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address<'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.maker),
      getAccountMeta(accounts.tokenMintA),
      getAccountMeta(accounts.tokenMintB),
      getAccountMeta(accounts.makerTokenAccountA),
      getAccountMeta(accounts.offerDetails),
      getAccountMeta(accounts.vault),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.associatedTokenProgram),
    ],
    programAddress,
    data: getMakeOfferInstructionDataEncoder().encode(
      args as MakeOfferInstructionDataArgs
    ),
  } as MakeOfferInstruction<
    TProgramAddress,
    TAccountMaker,
    TAccountTokenMintA,
    TAccountTokenMintB,
    TAccountMakerTokenAccountA,
    TAccountOfferDetails,
    TAccountVault,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountAssociatedTokenProgram
  >;

  return instruction;
}

export type ParsedMakeOfferInstruction<
  TProgram extends string = typeof ESCROW_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    maker: TAccountMetas[0];
    tokenMintA: TAccountMetas[1];
    tokenMintB: TAccountMetas[2];
    makerTokenAccountA: TAccountMetas[3];
    offerDetails: TAccountMetas[4];
    vault: TAccountMetas[5];
    tokenProgram: TAccountMetas[6];
    systemProgram: TAccountMetas[7];
    associatedTokenProgram: TAccountMetas[8];
  };
  data: MakeOfferInstructionData;
};

export function parseMakeOfferInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedMakeOfferInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 9) {
    // TODO: Coded error.
    throw new Error('Not enough accounts');
  }
  let accountIndex = 0;
  const getNextAccount = () => {
    const accountMeta = instruction.accounts![accountIndex]!;
    accountIndex += 1;
    return accountMeta;
  };
  return {
    programAddress: instruction.programAddress,
    accounts: {
      maker: getNextAccount(),
      tokenMintA: getNextAccount(),
      tokenMintB: getNextAccount(),
      makerTokenAccountA: getNextAccount(),
      offerDetails: getNextAccount(),
      vault: getNextAccount(),
      tokenProgram: getNextAccount(),
      systemProgram: getNextAccount(),
      associatedTokenProgram: getNextAccount(),
    },
    data: getMakeOfferInstructionDataDecoder().decode(instruction.data),
  };
}
