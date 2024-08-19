import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material'
import { useState } from 'react'
import { interval } from 'rxjs'
import LivestreamDialog from '../components/livestream/LivestreamDialog'
import LivestreamSpeedDial from '../components/livestream/LivestreamSpeedDial'
import NoLivestreams from '../components/livestream/NoLivestreams'
import { useSubscription } from '../hooks/observable'
import { useRPC } from '../hooks/useRPC'
import { LiveStreamProgress } from '../types'

const LiveStreamMonitorView: React.FC = () => {
  const { client } = useRPC()

  const [progress, setProgress] = useState<LiveStreamProgress>()
  const [openDialog, setOpenDialog] = useState(false)

  useSubscription(interval(1000), () => {
    client
      .progressLivestream()
      .then(r => setProgress(r.result))
  })

  const formatMicro = (microseconds: number) => {
    const ms = microseconds / 1_000_000
    let s = ms / 1000

    const hr = s / 3600
    s %= 3600

    const mt = s / 60
    s %= 60

    //           huh?
    const ss = (Math.abs(s - 1)).toFixed(0).padStart(2, '0')
    const mts = mt.toFixed(0).padStart(2, '0')
    const hrs = hr.toFixed(0).padStart(2, '0')

    return `${hrs}:${mts}:${ss}`
  }

  const mapStatusToChip = (status: number): React.ReactNode => {
    switch (status) {
      case 0:
        return <Chip label='Waiting/Wait start' color='warning' size='small' />
      case 1:
        return <Chip label='Downloading' color='primary' size='small' />
      case 2:
        return <Chip label='Completed' color='success' size='small' />
      case 3:
        return <Chip label='Errored' color='error' size='small' />
      default:
        return <Chip label='Unknown state' color='primary' size='small' />
    }
  }

  const stopAll = () => client.killAllLivestream()
  const stop = (url: string) => client.killLivestream(url)

  return (
    <>
      <LivestreamSpeedDial onOpen={() => setOpenDialog(s => !s)} onStopAll={stopAll} />
      {progress && Object.keys(progress).length === 0 ?
        <NoLivestreams /> :
        <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
          <Paper sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '80vh',
          }}>
            <TableContainer component={Box}>
              <Table sx={{ minWidth: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Livestream URL</TableCell>
                    <TableCell align="right">Status</TableCell>
                    <TableCell align="right">Time to live</TableCell>
                    <TableCell align="right">Starts on</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {progress && Object.keys(progress).map(k => (
                    <TableRow
                      key={k}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell>{k}</TableCell>
                      <TableCell align='right'>
                        {mapStatusToChip(progress[k].Status)}
                      </TableCell>
                      <TableCell align='right'>
                        {formatMicro(Number(progress[k].WaitTime))}
                      </TableCell>
                      <TableCell align='right'>
                        {new Date(progress[k].LiveDate).toLocaleString()}
                      </TableCell>
                      <TableCell align='right'>
                        <Button variant='contained' size='small' onClick={() => stop(k)}>
                          Stop
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Container>
      }
      <LivestreamDialog
        open={openDialog}
        onClose={() => setOpenDialog(s => !s)}
      />
    </>
  )
}

export default LiveStreamMonitorView