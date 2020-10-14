import { Observable } from 'rxjs';
import { ChatService } from './../../services/chat.service';
import { AuthService } from './../../services/auth.service';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { map, tap } from 'rxjs/operators';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import * as moment from 'moment';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {

  messages: Observable<any[]>;
  newMsg = '';
  chatTitle = '';
  currentUserId = this.auth.currentUserId;
  chat = null;
  currentDate: moment.Moment;
  breakPoints = [];

  @ViewChild(IonContent) content: IonContent;
  @ViewChild('input', { read: ElementRef }) msgInput: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private chatService: ChatService,
    private router: Router,
    private camera: Camera) { }

  ngOnInit(): void {
    this.route.params.subscribe(data => {
      this.chatService.getOneGroup(data.id).subscribe(res => {
        this.chat = res;
        console.log(res);
        this.messages = this.chatService.getChatMessages(this.chat.id).pipe(
          map(messages => {
            this.shouldDisplayBreak(messages);
            for (const msg of messages) {
              msg['user'] = this.getMsgFromName(msg['from']);
            }
            return messages;
          }),
          tap(() => {
            setTimeout(() => {
              this.content.scrollToBottom(300);
            }, 500);
          })
        );
      });
    });
    this.currentDate = moment();
  }

  sendMessage(): void {
    this.chatService.addChatMessage(this.newMsg, this.chat.id).then(() => {
      this.newMsg = '';
      this.content.scrollToBottom();
    });
  }

  isT1Plus1hBeforeT2(t1, t2) {
    t1 = t1.add(1, 'hours');
    return t1.isSameOrBefore(t2);
  }

  shouldDisplayBreak(messages) {
    messages.forEach((msg, i) => {
      const time = moment(msg.createdAt?.toMillis());
      if (this.isT1Plus1hBeforeT2(time, this.currentDate)){
        if (this.isT1Plus1hBeforeT2( time, messages[i + 1]?.createdAt?.toMillis())) {
        const indexOfBreakpoint = this.breakPoints.findIndex(element => {
          return element === i + 1;
        });

        if (indexOfBreakpoint !== -1) {
          this.breakPoints.splice(indexOfBreakpoint, 1, i + 1);
        } else {
          this.breakPoints.push(i + 1);
        }
      }
    }
    });
  }

  displayBreakPoint(i) {
    return (this.breakPoints.length > 0 && this.breakPoints.includes(i)) || i === 0;
  }

  getMsgFromName(userId: string): string {
    for (const usr of this.chat.users) {
      if (usr.id === userId) {
        return usr.nickname;
      }
    }
    return 'Deleted';
  }

  sendFile() {
    const options: CameraOptions = {
      quality: 70,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      sourceType: this.camera.PictureSourceType.CAMERA,
      correctOrientation: true
    };

    this.camera.getPicture(options).then(data => {
      const obj = this.chatService.addFileMessage(data, this.chat.id);
      const task = obj.task;

      task.then( res => {
        obj.ref.getDownloadURL().subscribe( url => {
          this.chatService.saveFileMessage(url, this.chat.id);
        });
      });

      task.percentageChanges().subscribe(change => {
        console.log('change', change);
      });
    });
  }

  resize(): void {
    this.msgInput.nativeElement.style.height = 'auto';
    this.msgInput.nativeElement.style.height = this.msgInput.nativeElement.scrollHeight + 'px';
  }

  leave(): void {
    const newUsers = this.chat.users.filter(usr => usr.id !== this.auth.currentUserId);

    this.chatService.leaveGroup(this.chat.id, newUsers).subscribe(res => {
      this.router.navigateByUrl('/chats');
    });
  }

}
