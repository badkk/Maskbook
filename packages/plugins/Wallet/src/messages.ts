import type BigNumber from 'bignumber.js'
import type {
    FungibleTokenDetailed,
    ERC721ContractDetailed,
    GasNow,
    NetworkType,
    ProviderType,
    TransactionState,
    Wallet,
    GasOption,
} from '@masknet/web3-shared-evm'
import type { TransactionReceipt } from 'web3-core'
import { createPluginMessage, PluginMessageEmitter } from '@masknet/plugin-infra'
import { PLUGIN_IDENTIFIER } from './constants'

export type TransactionDialogEvent =
    | {
          open: true
          state: TransactionState
          shareLink?: string
          summary?: string
          title?: string
      }
    | {
          open: false
      }

export type GasPriceDialogEvent = {
    open: boolean
    type?: keyof GasNow
}

export type SelectProviderDialogEvent =
    | {
          open: true
      }
    | {
          open: false
          address?: string
      }

export type ConnectWalletDialogEvent =
    | {
          open: true
          providerType: ProviderType
          networkType: NetworkType
      }
    | {
          open: false
      }

export type SelectWalletDialogEvent =
    | {
          open: true
          networkType: NetworkType
      }
    | {
          open: false
      }

export type CreateImportWalletDialogEvent = {
    open: boolean
}

export type CreateWalletDialogEvent = {
    name?: string
    open: boolean
}

export type ImportWalletDialogEvent = {
    name?: string
    open: boolean
}

export type WalletStatusDialogEvent = {
    open: boolean
}

export type GasSettingDialogEvent = {
    open: boolean
    gasLimit: string
    gasPrice?: BigNumber.Value
    maxFee?: BigNumber.Value
    priorityFee?: BigNumber.Value
    gasOption?: GasOption
}

export type WalletRenameDialogEvent = {
    open: boolean
    wallet: Wallet | null
}

export type WalletRiskWarningDialogEvent =
    | {
          open: true
          wallet?: Wallet
      }
    | {
          open: false
          type: 'cancel' | 'confirm'
      }

export type WalletConnectQRCodeDialogEvent =
    | {
          open: true
          uri: string
      }
    | {
          open: false
      }

export type SelectTokenDialogEvent =
    | {
          open: true
          uuid: string
          disableNativeToken?: boolean
          disableSearchBar?: boolean
          FixedTokenListProps?: {
              keyword?: string
              whitelist?: string[]
              blacklist?: string[]
              tokens?: FungibleTokenDetailed[]
              selectedTokens?: string[]
          }
      }
    | {
          open: false
          uuid: string

          /**
           * The selected detailed token.
           */
          token?: FungibleTokenDetailed
      }
export type SelectERC20TokenDialogEvent =
    | {
          open: true
          props?: {
              whitelist?: string[]
              blacklist?: string[]
              tokens?: FungibleTokenDetailed[]
              selectedTokens?: string[]
              onSelect?(token: FungibleTokenDetailed | null): void
          }
      }
    | {
          open: false
      }

export type SelectNftContractDialogEvent = {
    open: boolean
    uuid: string

    /**
     * The selected detailed nft contract.
     */
    contract?: ERC721ContractDetailed
}

export interface WalletMessage {
    /**
     * Transaction dialog
     */
    transactionDialogUpdated: TransactionDialogEvent

    /**
     * Gas price dialog
     */
    gasPriceDialogUpdated: GasPriceDialogEvent

    /**
     * Select wallet dialog
     */
    selectWalletDialogUpdated: SelectWalletDialogEvent

    /**
     * Create or import wallet choose dialog
     */
    createImportWalletDialogUpdated: CreateImportWalletDialogEvent

    /**
     * Create wallet dialog
     */
    createWalletDialogUpdated: CreateWalletDialogEvent

    /**
     * import wallet dialog
     */
    importWalletDialogUpdated: ImportWalletDialogEvent

    /**
     * Select provider dialog
     */
    selectProviderDialogUpdated: SelectProviderDialogEvent

    /**
     * Connect wallet dialog
     */
    connectWalletDialogUpdated: ConnectWalletDialogEvent

    /**
     * Wallet status dialog
     */
    walletStatusDialogUpdated: WalletStatusDialogEvent

    /**
     * Wallet status dialog
     */
    walletRenameDialogUpdated: WalletRenameDialogEvent

    /**
     * Gas setting dialog
     */
    gasSettingDialogUpdated: GasSettingDialogEvent

    /**
     * Select token dialog
     */
    selectTokenDialogUpdated: SelectTokenDialogEvent

    /**
     * Select nft contract dialog
     */
    selectNftContractDialogUpdated: SelectNftContractDialogEvent

    /**
     * WalletConnect QR Code dialog
     */
    walletConnectQRCodeDialogUpdated: WalletConnectQRCodeDialogEvent

    /**
     * Wallet Risk Warning dialog
     */
    walletRiskWarningDialogUpdated: WalletRiskWarningDialogEvent
    /**
     * Select token dialog
     */
    selectERC20TokenDialogUpdated: SelectERC20TokenDialogEvent

    walletsUpdated: void
    phrasesUpdated: void
    addressBookUpdated: void
    recentTransactionsUpdated: void
    receiptUpdated: TransactionReceipt
    requestsUpdated: void
    erc20TokensUpdated: void
    erc721TokensUpdated: void
    erc1155TokensUpdated: void
    /** true: Now locked; false: Now unlocked */
    walletLockStatusUpdated: boolean
    rpc: unknown
}

if (import.meta.webpackHot) import.meta.webpackHot.accept()
export const WalletMessages: { events: PluginMessageEmitter<WalletMessage> } = {
    events: createPluginMessage<WalletMessage>(PLUGIN_IDENTIFIER),
}
