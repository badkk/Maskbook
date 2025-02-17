import { WalletStartUp } from './components/StartUp'
import { EthereumRpcType, useWallet } from '@masknet/web3-shared-evm'
import { WalletAssets } from './components/WalletAssets'
import { Route, Switch, useHistory } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { PopupRoutes } from '../../index'
import { WalletContext } from './hooks/useWalletContext'
import { LoadingPlaceholder } from '../../components/LoadingPlaceholder'
import { useLocation } from 'react-router-dom'
import { useAsyncRetry } from 'react-use'
import { WalletMessages, WalletRPC } from '../../../../plugins/Wallet/messages'
import Services from '../../../service'
import SelectWallet from './SelectWallet'

const ImportWallet = lazy(() => import('./ImportWallet'))
const AddDeriveWallet = lazy(() => import('./AddDeriveWallet'))
const WalletSettings = lazy(() => import('./WalletSettings'))
const WalletRename = lazy(() => import('./WalletRename'))
const DeleteWallet = lazy(() => import('./DeleteWallet'))
const CreateWallet = lazy(() => import('./CreateWallet'))
const SwitchWallet = lazy(() => import('./SwitchWallet'))
const BackupWallet = lazy(() => import('./BackupWallet'))
const AddToken = lazy(() => import('./AddToken'))
const TokenDetail = lazy(() => import('./TokenDetail'))
const SignRequest = lazy(() => import('./SignRequest'))
const GasSetting = lazy(() => import('./GasSetting'))
const Transfer = lazy(() => import('./Transfer'))
const ContractInteraction = lazy(() => import('./ContractInteraction'))
const Unlock = lazy(() => import('./Unlock'))

export default function Wallet() {
    const wallet = useWallet()
    const location = useLocation()
    const history = useHistory()

    // const lockStatus = useValueRef(currentIsMaskWalletLockedSettings)

    const { loading: getRequestLoading, retry } = useAsyncRetry(async () => {
        if (
            [PopupRoutes.ContractInteraction, PopupRoutes.WalletSignRequest, PopupRoutes.GasSetting].some(
                (item) => item === location.pathname,
            )
        )
            return

        const payload = await WalletRPC.topUnconfirmedRequest()
        if (!payload) return

        const computedPayload = await Services.Ethereum.getComputedPayload(payload)
        const value = {
            payload,
            computedPayload,
        }

        if (value?.computedPayload) {
            switch (value.computedPayload.type) {
                case EthereumRpcType.SIGN:
                    history.replace(PopupRoutes.WalletSignRequest)
                    break
                case EthereumRpcType.CONTRACT_INTERACTION:
                case EthereumRpcType.SEND_ETHER:
                    history.replace(PopupRoutes.ContractInteraction)
                    break
                default:
                    break
            }
        }
    }, [location])

    useEffect(() => {
        return WalletMessages.events.requestsUpdated.on(retry)
    }, [retry])

    // useEffect(() => {
    //     if (lockStatus) {
    //         history.push(PopupRoutes.Unlock)
    //     }
    // }, [lockStatus])

    return (
        <Suspense fallback={<LoadingPlaceholder />}>
            <WalletContext.Provider>
                {getRequestLoading ? (
                    <LoadingPlaceholder />
                ) : (
                    <Switch>
                        <Route path={PopupRoutes.Wallet} exact>
                            {!wallet ? <WalletStartUp /> : <WalletAssets />}
                        </Route>
                        <Route path={PopupRoutes.ImportWallet} children={<ImportWallet />} exact />
                        <Route path={PopupRoutes.AddDeriveWallet} children={<AddDeriveWallet />} exact />
                        <Route path={PopupRoutes.WalletSettings} children={<WalletSettings />} exact />
                        <Route path={PopupRoutes.WalletRename} children={<WalletRename />} exact />
                        <Route path={PopupRoutes.DeleteWallet} children={<DeleteWallet />} exact />
                        <Route path={PopupRoutes.CreateWallet} children={<CreateWallet />} exact />
                        <Route path={PopupRoutes.SwitchWallet} children={<SwitchWallet />} exact />
                        <Route path={PopupRoutes.BackupWallet} children={<BackupWallet />} exact />
                        <Route path={PopupRoutes.AddToken} children={<AddToken />} exact />
                        <Route path={PopupRoutes.WalletSignRequest} children={<SignRequest />} />
                        <Route path={PopupRoutes.GasSetting} children={<GasSetting />} />
                        <Route path={PopupRoutes.TokenDetail} children={<TokenDetail />} exact />
                        <Route path={PopupRoutes.Transfer} children={<Transfer />} exact />
                        <Route path={PopupRoutes.ContractInteraction} children={<ContractInteraction />} />
                        <Route path={PopupRoutes.SelectWallet} children={<SelectWallet />} />
                        {/*<Route path={PopupRoutes.Unlock} children={<Unlock />} />*/}
                    </Switch>
                )}
            </WalletContext.Provider>
        </Suspense>
    )
}
