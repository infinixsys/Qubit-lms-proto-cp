"""Rebuild original, explicitly labelled instructional demo assets (requires ffmpeg/reportlab)."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import subprocess
import textwrap
import tempfile
root = Path(__file__).resolve().parents[1] / 'server' / 'assets'
root.mkdir(exist_ok=True)
c = canvas.Canvas(str(root / 'repair-workbook.pdf'))
c.setTitle('Refix India Institute - Repair Diagnosis Workbook')
for section, prompts in [
 ('01 / Device intake', ['Training device model and serial (no customer passwords)', 'Reported symptom and prior repair history', 'Consent, data privacy and estimated scope']),
 ('02 / Safe bench preparation', ['Disconnect external power; isolate battery per manufacturer guidance', 'Check ESD mat, wrist strap and tools with your instructor', 'Stop for swollen / hot / damaged batteries; do not open mains PSUs']),
 ('03 / Observation and diagnosis', ['Photograph the unpowered training board with consent', 'Record visual damage, connectors and corrosion', 'Plan measurements using exact model service documentation']),
 ('04 / Verification and handover', ['Record the fault hypothesis and evidence', 'Instructor review before any powered test or rework', 'Document verification, estimate, warranty terms and e-waste handling'])]:
 c.setFillColor(HexColor('#102238'));c.rect(0,0,596,842,fill=1,stroke=0)
 c.setFillColor(HexColor('#ffb366'));c.setFont('Helvetica-Bold',11);c.drawString(48,785,'REFIX INDIA INSTITUTE / BENCH WORKBOOK')
 c.setFillColor(HexColor('#ffffff'));c.setFont('Helvetica-Bold',23);c.drawString(48,730,section)
 c.setFont('Helvetica',11)
 y=675
 for prompt in prompts:
  for line in textwrap.wrap(prompt,75): c.drawString(48,y,line);y-=19
  c.setStrokeColor(HexColor('#53677e'))
  for j in range(4): y-=27;c.line(48,y,548,y)
  y-=30
 c.setFillColor(HexColor('#bbcad9'));c.setFont('Helvetica',9);c.drawString(48,45,'Original prototype material. Practise only on training boards under supervision.');c.showPage()
c.save()
(root/'repair-workflow.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="640" viewBox="0 0 1000 640"><rect width="1000" height="640" rx="24" fill="#102238"/><g font-family="sans-serif"><text x="60" y="70" fill="#ffb366" font-size="17" font-weight="bold">REFIX INDIA INSTITUTE / DIAGNOSIS WORKFLOW</text><text x="60" y="125" fill="white" font-size="34" font-weight="bold">Observe. Measure. Verify.</text>''' + ''.join(f'<rect x="60" y="{180+i*85}" width="880" height="65" rx="12" fill="#213b56"/><text x="85" y="{220+i*85}" fill="white" font-size="22">{i+1:02d}   {t}</text>' for i,t in enumerate(['Intake and consent - document the reported symptom','Isolate power - follow battery and ESD procedures','Inspect and plan - record evidence before rework','Verify with your trainer - document the outcome'])) + '<text x="60" y="585" fill="#bbcad9" font-size="16">Demo workflow. Use exact model documentation. Do not open mains power supplies.</text></g></svg>')
for topic,slides in {
 'laptop': [('LAPTOP DIAGNOSIS','An evidence-led repair workflow'),('01  START WITH THE JOB CARD','Record model, symptom and customer consent.'),('02  PREPARE A SAFE BENCH','Isolate power and battery per manufacturer guidance.'),('03  LOOK BEFORE YOU TEST','Inspect connectors, corrosion and visible damage.'),('04  RECORD THE EVIDENCE','Use exact model documentation. Avoid guesswork.'),('05  ASK YOUR TRAINER','Verify the plan on an unpowered training board.')],
 'mobile': [('MOBILE BOARD INSPECTION','Observe first. Rework only with a clear plan.'),('01  CUSTOMER CONSENT','Record the reported fault. Protect personal data.'),('02  BATTERY SAFETY','Stop for swollen or hot batteries. Do not apply heat.'),('03  ESD PREPARATION','Use a checked ESD mat and suitable tools.'),('04  INSPECT THE BOARD','Look for corrosion and damaged connectors.'),('05  DOCUMENT AND REVIEW','Share observations with your trainer before rework.')]
}.items():
 with tempfile.TemporaryDirectory() as td:
  filters=[]
  def txt(value, y, size, color, enable=None):
   p=Path(td)/f'text-{len(filters)}.txt';p.write_text(value)
   f=f"drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:textfile={p}:x=70:y={y}:fontsize={size}:fontcolor={color}"
   if enable:f+=f":enable='{enable}'"
   filters.append(f)
  txt('REFIX INDIA INSTITUTE  /  DEMO CLASS',55,19,'0xffb366')
  for i,(title,body) in enumerate(slides):
   en=f'between(t,{i*6},{(i+1)*6-0.01})'
   txt(title,165,31,'white',en)
   for j,line in enumerate(textwrap.wrap(body,55)):txt(line,250+j*44,25,'0xd2dfeb',en)
   txt(f'{i+1:02} / 06',395,20,'0xffb366',en)
  txt('Original visual sample - not a full repair qualification.',475,16,'0xbacbdb')
  filters+=['drawbox=x=70:y=445:w=1140:h=4:color=0x30475d:t=fill','drawbox=x=70:y=445:w=190:h=4:color=0xffa04c:t=fill']
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=0x102238:s=1280x560:r=24:d=36','-vf',','.join(filters),'-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',str(root/f'repair-{topic}.mp4')],check=True)
print('Created two 36-second original visual demo classes, PDF workbook and SVG workflow.')
