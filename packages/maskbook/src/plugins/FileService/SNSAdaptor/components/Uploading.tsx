import { Grid, Typography } from '@material-ui/core'
import { makeStyles } from '@masknet/theme'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { File } from 'react-feather'
import { useHistory, useLocation } from 'react-router-dom'
import { useAsync } from 'react-use'
import { timeout, useI18N } from '../../../../utils'
import { FileRouter, ipfsGw, ipfsPinner } from '../../constants'
import type { FileInfo } from '../../types'
import { PluginFileServiceRPC, PluginFileServiceRPCGenerator } from '../../Worker/rpc'
import { useExchange } from '../hooks/Exchange'
import { FileName } from './FileName'
import { ProgressBar } from './ProgressBar'

const useStyles = makeStyles()({
    container: {
        height: 250,
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        userSelect: 'none',
        paddingTop: 18,
        paddingBottom: 18,
    },
    name: {
        fontSize: 16,
        lineHeight: 1.75,
        textAlign: 'center',
        color: '#3B3B3B',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        width: 400,
    },
})

interface RouteState {
    key: string | undefined
    name: string
    size: number
    type: string
    block: Uint8Array
    file: File
    checksum: string
    useCDN: boolean
    useIPFS: boolean
}

interface IPFSUploadRes {
    Hash: string
    Size: string
    Name: string
}

export const Uploading: React.FC = () => {
    const { t } = useI18N()
    const { classes } = useStyles()
    const history = useHistory()
    const { onUploading } = useExchange()
    const [startedAt] = useState(Date.now())
    const [preparing, setPreparing] = useState(true)
    const [sendSize, setSendSize] = useState(0)
    const { state } = useLocation<RouteState>()
    useEffect(() => {
        onUploading(true)
        return () => onUploading(false)
    }, [onUploading])
    const { error } = useAsync(async () => {
        if (state.useIPFS) {
            setPreparing(false)
            console.log(state)
            const formData = new FormData()
            const AuthBasic =
                'Basic Y1RISnJmM2p0MnBaclpKdjRxblhOWEZmNmJNSzNDdUxxaTVVRGMyVzR6VnlDRnRYdDoweDljMTdmOGRkZDlmN2ExZmNhY2VkMjE2ZjNmNzFlZmRkOWE2ZWY4NzdmMWE5ZDA1MjM5MDc3N2EzNDkyM2FlMWIwNzU5NDI2OTk0M2Q3MmZkYmY1MTIzNmQ2ZmFjNGQzZGVlNDhiNjViODYxNzM5MTE0Mjg5MjkwNDNiMmI5Zjg0'
            const AuthBearer =
                'Bearer Y1RISnJmM2p0MnBaclpKdjRxblhOWEZmNmJNSzNDdUxxaTVVRGMyVzR6VnlDRnRYdDoweDljMTdmOGRkZDlmN2ExZmNhY2VkMjE2ZjNmNzFlZmRkOWE2ZWY4NzdmMWE5ZDA1MjM5MDc3N2EzNDkyM2FlMWIwNzU5NDI2OTk0M2Q3MmZkYmY1MTIzNmQ2ZmFjNGQzZGVlNDhiNjViODYxNzM5MTE0Mjg5MjkwNDNiMmI5Zjg0'
            formData.append('file', state.file, state.name)
            const upResult = await axios.request<IPFSUploadRes | null>({
                data: formData,
                headers: { Authorization: AuthBasic },
                maxContentLength: 100 * 1024 * 1024,
                method: 'POST',
                onUploadProgress: (p: { loaded: number; total: number }) => {
                    const percent = p.loaded / p.total
                    setSendSize(state.size * percent)
                },
                params: { pin: true },
                url: `${ipfsGw}/api/v0/add`,
            })
            if (upResult.data) {
                const cid = upResult.data.Hash
                const name = upResult.data.Name
                const pinResult = await axios.request({
                    data: {
                        cid,
                        name,
                    },
                    headers: { Authorization: AuthBearer },
                    method: 'POST',
                    url: `${ipfsPinner}/psa/pins`,
                })
                console.log(pinResult)

                if (pinResult.status === 200) {
                    // CID -> ladingTxID
                    const item: FileInfo = {
                        type: 'file',
                        provider: 'crust',
                        id: state.checksum,
                        name: state.name,
                        size: state.size,
                        createdAt: new Date(startedAt),
                        key: state.key,
                        payloadTxID: cid,
                        landingTxID: cid,
                    }
                    await PluginFileServiceRPC.setFileInfo(item)
                    history.replace(FileRouter.uploaded, item)
                }
            }
        } else {
            const payloadTxID = await timeout(
                PluginFileServiceRPC.makeAttachment({
                    key: state.key,
                    block: state.block,
                    type: state.type,
                }),
                60000, // ≈ 1 minute
            )
            setPreparing(false)
            for await (const pctComplete of PluginFileServiceRPCGenerator.upload(payloadTxID)) {
                setSendSize(state.size * (pctComplete / 100))
            }
            const landingTxID = await timeout(
                PluginFileServiceRPC.uploadLandingPage({
                    name: state.name,
                    size: state.size,
                    txId: payloadTxID,
                    type: state.type,
                    key: state.key,
                    useCDN: state.useCDN,
                    useIPFS: state.useIPFS,
                }),
                300000, // ≈ 5 minutes
            )
            const item: FileInfo = {
                type: 'file',
                provider: 'arweave',
                id: state.checksum,
                name: state.name,
                size: state.size,
                createdAt: new Date(startedAt),
                key: state.key,
                payloadTxID: payloadTxID,
                landingTxID: landingTxID,
            }
            await PluginFileServiceRPC.setFileInfo(item)
            history.replace(FileRouter.uploaded, item)
        }
    }, [])
    useEffect(() => {
        if (error) {
            onUploading(false)
        }
    }, [error, onUploading])
    if (error) {
        return (
            <Grid container className={classes.container}>
                <Grid item>
                    <File width={96} height={120} />
                </Grid>
                <Grid item>
                    <Typography>{t('plugin_file_service_signing_failed')}</Typography>
                </Grid>
            </Grid>
        )
    }
    return (
        <Grid container className={classes.container}>
            <Grid item>
                <File width={96} height={120} />
            </Grid>
            <Grid item>
                <FileName name={state.name} />
                <ProgressBar preparing={preparing} fileSize={state.size} sendSize={sendSize} startedAt={startedAt} />
            </Grid>
        </Grid>
    )
}
