import type { RequestArguments } from 'web3-core'
import type { JsonRpcPayload, JsonRpcResponse } from 'web3-core-helpers'
import { INTERNAL_nativeSend, INTERNAL_send, SendOverrides } from './send'
import { hasNativeAPI, nativeAPI } from '../../../utils/native-rpc'
import { EthereumMethodType, ProviderType } from '@masknet/web3-shared-evm'
import { currentAccountMaskWalletSettings, currentProviderSettings } from '../../../plugins/Wallet/settings'
import { defer, Flags } from '../../../utils'
import { WalletRPC } from '../../../plugins/Wallet/messages'
import { openPopupsWindow } from '../HelperService'
import { memoizePromise } from '@dimensiondev/kit'
import Services from '../../service'

let id = 0

const UNCONFIRMED_CALLBACK_MAP = new Map<number, (error: Error | null, response?: JsonRpcResponse) => void>()
const RISK_METHOD_LIST = [
    EthereumMethodType.ETH_SIGN,
    EthereumMethodType.PERSONAL_SIGN,
    EthereumMethodType.ETH_SIGN_TYPED_DATA,
    EthereumMethodType.ETH_DECRYPT,
    EthereumMethodType.ETH_GET_ENCRYPTION_PUBLIC_KEY,
    EthereumMethodType.ETH_SEND_TRANSACTION,
]

interface RequestOptions {
    popupsWindow?: boolean
}

function getSendMethod() {
    if (hasNativeAPI && nativeAPI) return INTERNAL_nativeSend
    return INTERNAL_send
}

function getPayloadId(payload: JsonRpcPayload) {
    return typeof payload.id === 'string' ? Number.parseInt(payload.id, 10) : payload.id
}

function isRiskMethod(method: EthereumMethodType) {
    return RISK_METHOD_LIST.includes(method)
}

export async function request<T extends unknown>(
    requestArguments: RequestArguments,
    overrides?: SendOverrides,
    options?: RequestOptions,
) {
    return new Promise<T>(async (resolve, reject) => {
        requestSend(
            {
                jsonrpc: '2.0',
                id,
                params: [],
                ...requestArguments,
            },
            (error, response) => {
                if (error || response?.error) reject(error ?? response?.error)
                else resolve(response?.result)
            },
            overrides,
            options,
        )
    })
}

export const requestWithCache = memoizePromise(request, (requestArguments) => JSON.stringify(requestArguments))

export async function requestWithoutPopup<T extends unknown>(
    requestArguments: RequestArguments,
    overrides?: SendOverrides,
) {
    return request(
        requestArguments,
        { ...overrides, account: currentAccountMaskWalletSettings.value, providerType: ProviderType.MaskWallet },
        { popupsWindow: false },
    )
}

export async function requestSend(
    payload: JsonRpcPayload,
    callback: (error: Error | null, response?: JsonRpcResponse) => void,
    overrides?: SendOverrides,
    options?: RequestOptions,
) {
    id += 1
    const { providerType = currentProviderSettings.value } = overrides ?? {}
    const { popupsWindow = true } = options ?? {}
    const payload_ = {
        ...payload,
        id,
    }
    if (
        Flags.v2_enabled &&
        isRiskMethod(payload_.method as EthereumMethodType) &&
        providerType === ProviderType.MaskWallet
    ) {
        try {
            await WalletRPC.pushUnconfirmedRequest(payload_)
        } catch (error) {
            callback(error instanceof Error ? error : new Error('Failed to add request.'))
            return
        }
        UNCONFIRMED_CALLBACK_MAP.set(payload_.id, callback)
        if (popupsWindow) openPopupsWindow()
        return
    }
    getSendMethod()(payload_, callback, overrides)
}

export async function requestSendWithoutPopup(
    payload: JsonRpcPayload,
    callback: (error: Error | null, response?: JsonRpcResponse) => void,
    overrides?: SendOverrides,
) {
    return requestSend(payload, callback, {
        ...overrides,
        account: currentAccountMaskWalletSettings.value,
        providerType: ProviderType.MaskWallet,
    })
}

export async function confirmRequest(payload: JsonRpcPayload) {
    const pid = getPayloadId(payload)
    if (!pid) return
    const [deferred, resolve, reject] = defer<JsonRpcResponse | undefined, Error>()
    getSendMethod()(
        payload,
        (error, response) => {
            UNCONFIRMED_CALLBACK_MAP.get(pid)?.(error, response)

            if (error) reject(error)
            else if (response?.error) reject(new Error('Transaction error!'))
            else {
                WalletRPC.deleteUnconfirmedRequest(payload)
                    // Close pop-up window when request is confirmed
                    .then(Services.Helper.removePopupWindow)
                    .then(() => {
                        UNCONFIRMED_CALLBACK_MAP.delete(pid)
                    })
                resolve(response)
            }
        },
        {
            account: currentAccountMaskWalletSettings.value,
            providerType: ProviderType.MaskWallet,
        },
    )
    return deferred
}

export async function rejectRequest(payload: JsonRpcPayload) {
    const pid = getPayloadId(payload)
    if (!pid) return
    UNCONFIRMED_CALLBACK_MAP.get(pid)?.(new Error('User rejected!'))
    await WalletRPC.deleteUnconfirmedRequest(payload)
    // Close pop-up window when request is rejected
    await Services.Helper.removePopupWindow()
    UNCONFIRMED_CALLBACK_MAP.delete(pid)
}
