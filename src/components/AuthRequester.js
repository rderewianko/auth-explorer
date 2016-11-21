import React, {Component} from 'react';
import 'whatwg-fetch';
import AceEditor from 'react-ace';
import { Dimmer, Loader, Button, Input, Form, Container, Message, Divider } from 'semantic-ui-react';
import AuthUrlList from './AuthUrlList';
import IdentityAuthenticatorList from './IdentityAuthenticatorList';
import ScopeList from './ScopeList';
import './AuthRequester.css';

import 'brace/mode/json';
import 'brace/theme/github';

import {
    USERNAME_PASSWORD_AUTHENTICATOR_URN,
    TOTP_AUTHENTICATOR_URN,
    EMAIL_DELIVERED_CODE_AUTHENTICATOR_URN,
    TELEPHONY_DELIVERED_CODE_AUTHENTICATOR_URN,
    CONSENT_HANDLER_URN,
    INITIAL_REDIRECT_DESCRIPTION,
    LOGIN_STEP_DESCRIPTION,
    SECOND_FACTOR_STEP_DESCRIPTION,
    CONSENT_STEP_DESCRIPTION,
    FLOW_URI_STEP_DESCRIPTION,
    CONTINUE_REDIRECT_URI_STEP_DESCRIPTION,
    META_LOCATION_URI_DESCRIPTION,
    FOLLOWUP_URI_DESCRIPTION,
    USERNAME_RECOVERY_URI_DESCRIPTION,
    PASSWORD_RECOVERY_URI_DESCRIPTION,
    CONTINUE_REDIRECT_URI_DESCRIPTION,
    FLOW_URI_DESCRIPTION
} from '../Constants';

class AuthRequester extends Component {
  constructor(props) {
    super(props);
    this.state = {
      url: this.props.url,
      body: '',
      loading: false,
      authUrls: [],
      authenticators: [],
      scopes: [],
      approved: false,
      description: INITIAL_REDIRECT_DESCRIPTION
    };
    this.setAuthUrl = this.setAuthUrl.bind(this);
    this.updateUrl = this.updateUrl.bind(this);
    this.setBodyFromObject = this.setBodyFromObject.bind(this);
    this.updateBody = this.updateBody.bind(this);
    this.parseBody = this.parseBody.bind(this);
    this.doGet = this.doGet.bind(this);
    this.doPut = this.doPut.bind(this);
    this.removeIdentityAuthenticator = this.removeIdentityAuthenticator.bind(this);
    this.setUsernamePassword = this.setUsernamePassword.bind(this);
    this.setTotp = this.setTotp.bind(this);
    this.setSendEmailRequest = this.setSendEmailRequest.bind(this);
    this.setEmailVerifyCode = this.setEmailVerifyCode.bind(this);
    this.setSendTelephonyRequest = this.setSendTelephonyRequest.bind(this);
    this.setTelephonyVerifyCode = this.setTelephonyVerifyCode.bind(this);
    this.setScopesApproved = this.setScopesApproved.bind(this);
    this.setOptionalScope = this.setOptionalScope.bind(this);
  }

  setAuthUrl(url) {
    this.setState({ url: url });
    this.props.setDispatcherUrl(url);
  }

  // This is called when the user updates the URL directly.
  updateUrl(event) {
    this.setAuthUrl(event.target.value);
  }

  setBodyFromObject(body) {
    const json = JSON.stringify(body, null, 2);
    this.setState({ body: json });
    this.parseBody(json);
  }

  // This is called when the user updates the request body directly
  // using the ACE editor.
  updateBody(body) {
    this.setState({ body: body });
    try {
      this.parseBody(body);
    } catch (e) {
      // Do nothing, because the body might fail to parse while the
      // user is making edits.
    }
  }

  static extractUrls(body) {
    let urls = [];
    if (body['meta']) {
      if (body['meta']['location']) {
        urls.push({
          url: body['meta']['location'],
          name: 'meta.location',
          description: META_LOCATION_URI_DESCRIPTION
        });
      }
    }
    if (body['followUp']) {
      if (body['followUp']['$ref']) {
        urls.push({
          url: body['followUp']['$ref'],
          name: 'Followup',
          description: FOLLOWUP_URI_DESCRIPTION
        });
      }
    }
    const urn = USERNAME_PASSWORD_AUTHENTICATOR_URN;
    if (body[urn]) {
      if (body[urn]['usernameRecovery']['$ref']) {
        urls.push({
          url: body[urn]['usernameRecovery']['$ref'],
          name: 'Username Recovery',
          description: USERNAME_RECOVERY_URI_DESCRIPTION
        });
      }
      if (body[urn]['passwordRecovery']['$ref']) {
        urls.push({
          url: body[urn]['passwordRecovery']['$ref'],
          name: 'Password Recovery',
          description: PASSWORD_RECOVERY_URI_DESCRIPTION
        });
      }
    }
    if (body['flow_uri']) {
      urls.push({
        url: body['flow_uri'],
        name: 'Flow URI',
        description: FLOW_URI_DESCRIPTION
      });
    }
    if (body['continue_redirect_uri']) {
      urls.push({
        url: body['continue_redirect_uri'],
        name: 'Continue Redirect URI',
        description: CONTINUE_REDIRECT_URI_DESCRIPTION
      });
    }
    return urls;
  }

  parseBody(json) {
    let requestUrl = this.state.url;
    let description = '';
    if (json) {
      let body = JSON.parse(json);

      // Set the current step and description
      if (body['meta']) {
        const resourceType = body['meta']['resourceType'];
        switch(resourceType) {
          case 'secondFactor':
            description = SECOND_FACTOR_STEP_DESCRIPTION;
            this.props.setActiveStep('Second factor');
            break;
          case 'approve':
            description = CONSENT_STEP_DESCRIPTION;
            this.props.setActiveStep('Consent');
            break;
          default:
            description = LOGIN_STEP_DESCRIPTION;
            this.props.setActiveStep('Log in');
        }
        // Set the current URL — this ensures that a PUT results in
        // an updated request URL
        requestUrl = body['meta']['location'];
      }
      // Special cases for OAuth servlet responses
      if (body['flow_uri']) {
        description = FLOW_URI_STEP_DESCRIPTION;
      }
      if (body['continue_redirect_uri']) {
        description = CONTINUE_REDIRECT_URI_STEP_DESCRIPTION;
      }

      // Common fields
      const meta = body.meta;
      const followUp = body.followUp;
      let continueRedirectUri = '';
      if (body['continue_redirect_uri']) {
        continueRedirectUri = body['continue_redirect_uri'];
      }

      // Login and 2FA fields
      const authenticators = Object.keys(body).filter(key => {
        return key.startsWith('urn:');
      });
      const client = body.client;
      let username = '';
      let formattedName = '';
      if (body['sessionIdentityResource']) {
        username = body['sessionIdentityResource']['userName'];
        formattedName = body['sessionIdentityResource']['name.formatted'];
      }
      let authUrls = AuthRequester.extractUrls(body);

      // Consent fields
      let scopes = [];
      let approved = false;
      if (body['schemas'] && body['schemas'].includes(CONSENT_HANDLER_URN)) {
        scopes = body['scopes'];
        approved = body['approved'];
      }

      this.setState({
        url: requestUrl,
        meta: meta,
        followUp: followUp,
        authenticators: authenticators,
        username: username,
        formattedName: formattedName,
        client: client,
        continueRedirectUri: continueRedirectUri,
        authUrls: authUrls,
        scopes: scopes,
        approved: approved,
        description: description
      });
    }
  }

  removeIdentityAuthenticator(urn) {
    let body = JSON.parse(this.state.body);
    delete body[urn];
    this.setBodyFromObject(body);
  }

  setUsernamePassword(username, password) {
    let body = JSON.parse(this.state.body);
    if (body[USERNAME_PASSWORD_AUTHENTICATOR_URN]) {
      body[USERNAME_PASSWORD_AUTHENTICATOR_URN]['username'] = username;
      body[USERNAME_PASSWORD_AUTHENTICATOR_URN]['password'] = password;
      this.setBodyFromObject(body);
    }
  }

  setTotp(password) {
    let body = JSON.parse(this.state.body);
    if (body[TOTP_AUTHENTICATOR_URN]) {
      body[TOTP_AUTHENTICATOR_URN]['password'] = password;
      this.setBodyFromObject(body);
    }
  }

  setSendEmailRequest(emailAddress, messageSubject, messageText) {
    let body = JSON.parse(this.state.body);
    if (body[EMAIL_DELIVERED_CODE_AUTHENTICATOR_URN]) {
      body[EMAIL_DELIVERED_CODE_AUTHENTICATOR_URN] = {
        messageSubject: messageSubject,
        messageText: messageText
      };
      this.setBodyFromObject(body);
    }
  }

  setEmailVerifyCode(verifyCode) {
    let body = JSON.parse(this.state.body);
    if (body[EMAIL_DELIVERED_CODE_AUTHENTICATOR_URN]) {
      body[EMAIL_DELIVERED_CODE_AUTHENTICATOR_URN] = {
        verifyCode: verifyCode
      };
      this.setBodyFromObject(body);
    }
  }

  setSendTelephonyRequest(phoneNumber, message, language) {
    let body = JSON.parse(this.state.body);
    if (body[TELEPHONY_DELIVERED_CODE_AUTHENTICATOR_URN]) {
      const deliverCode = {
        message: message,
        language: language
      };
      body[TELEPHONY_DELIVERED_CODE_AUTHENTICATOR_URN] = {
        deliverCode: deliverCode
      };
      this.setBodyFromObject(body);
    }
  }

  setTelephonyVerifyCode(verifyCode) {
    let body = JSON.parse(this.state.body);
    if (body[TELEPHONY_DELIVERED_CODE_AUTHENTICATOR_URN]) {
      body[TELEPHONY_DELIVERED_CODE_AUTHENTICATOR_URN] = {
        verifyCode: verifyCode
      };
      this.setBodyFromObject(body);
    }
  }

  setScopesApproved(approved) {
    let body = JSON.parse(this.state.body);
    body['approved'] = approved;
    this.setBodyFromObject(body);
  }

  setOptionalScope(optionalScopeName, approve) {
    let body = JSON.parse(this.state.body);
    const optionalScopes = body['optionalScopes'] || [];
    let optionalScopesSet = new Set(optionalScopes);
    if (approve) {
      optionalScopesSet.add(optionalScopeName);
    } else {
      optionalScopesSet.delete(optionalScopeName);
    }
    if (optionalScopesSet.size > 0) {
      body['optionalScopes'] = [...optionalScopesSet];
    } else {
      delete body['optionalScopes'];
    }
    this.setBodyFromObject(body);
  }

  static doSubmit(event) {
    event.preventDefault();
  }

  doGet() {
    console.log("GET");
    this.setState({ loading: true });
    // Don't use fetch if we're doing a GET on the continue_redirect_uri.
    if (this.state.continueRedirectUri && this.state.url === this.state.continueRedirectUri) {
      console.log("requesting continue_redirect_uri; redirecting");
      window.location = this.state.continueRedirectUri;
      return;
    }
    fetch(this.state.url, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      }).then(response => {
        this.setState({ loading: false });
        return response.json();
      }).then(json => {
        this.setBodyFromObject(json);
      }).catch(ex => {
        this.setState({ loading: false });
        console.warn('parsing failed', ex)
      });
  }

  doPut() {
    console.log("PUT");
    this.setState({ loading: true });
    fetch(this.state.url, {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: this.state.body
      }).then(response => {
        this.setState({ loading: false });
        return response.json();
      }).then(json => {
        this.setBodyFromObject(json);
      }).catch(ex => {
        this.setState({ loading: false });
        console.warn('parsing failed', ex)
      });
  }

  render() {
    const { active } = this.state.loading;
    const bodyIsPresent = !!this.state.body;
    const authenticatorData = {
      username: this.state.username
    };
    return (
        <div className="ui AuthRequester">
          <Container>
            <Dimmer.Dimmable dimmed={active}>
              <Dimmer active={active}/>
              <Loader active={active}/>
              <Form onSubmit={AuthRequester.doSubmit}>
                <Form.Group inline>
                  <Form.Field width="sixteen">
                    <label>URL</label>
                    <Input
                        type="text"
                        name="url"
                        className="Url"
                        onChange={this.updateUrl}
                        value={this.state.url}
                    />
                  </Form.Field>
                </Form.Group>
                { bodyIsPresent &&
                  <Form.Group>
                    <Form.Field width="sixteen">
                      <AceEditor
                          mode="json"
                          theme="github"
                          showPrintMargin={false}
                          onChange={this.updateBody}
                          value={this.state.body}
                          name="AuthExplorerEditor"
                          width="100%"
                      />
                    </Form.Field>
                  </Form.Group>
                }
                <Form.Group inline>
                  <Form.Field>
                    <Button primary onClick={this.doGet}>GET</Button>
                  </Form.Field>
                  {bodyIsPresent &&
                    <Form.Field>
                      <Button secondary onClick={this.doPut}>PUT</Button>
                    </Form.Field>
                  }
                </Form.Group>
              </Form>
              <Divider hidden/>
              <Message>
                <p>{this.state.description}</p>
              </Message>
              <Divider hidden/>
            </Dimmer.Dimmable>
          </Container>
          <Divider section/>
          <ScopeList
              scopes={this.state.scopes}
              approved={this.state.approved}
              setScopesApproved={this.setScopesApproved}
              setOptionalScope={this.setOptionalScope}
          />
          <IdentityAuthenticatorList
              authenticators={this.state.authenticators}
              removeAuthenticator={this.removeIdentityAuthenticator}
              data={authenticatorData}
              setUsernamePassword={this.setUsernamePassword}
              setTotp={this.setTotp}
              setSendEmailRequest={this.setSendEmailRequest}
              setEmailVerifyCode={this.setEmailVerifyCode}
              setSendTelephonyRequest={this.setSendTelephonyRequest}
              setTelephonyVerifyCode={this.setTelephonyVerifyCode}
          />
          <AuthUrlList
              authUrls={this.state.authUrls}
              setAuthUrl={this.setAuthUrl}
          />
        </div>
    );
  }
}

export default AuthRequester;
